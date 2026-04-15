"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CompanyBrain } from "@/lib/brain";
import { AGENTS, AgentDef, AgentId } from "@/lib/agents";
import {
  Round,
  RoundResponse,
  ConversationTurn,
  saveTranscript,
  loadTranscript,
  buildAgentHistory,
} from "@/lib/transcript";
import { AgentCard } from "./AgentCard";
import { AgentResponse } from "./AgentResponse";
import { QuestionBar } from "./QuestionBar";
import { BrainBanner } from "./BrainBanner";
import { v4 as uuidv4 } from "uuid";
import { Sparkles, Trash2 } from "lucide-react";

const DEFAULT_QUESTIONS = [
  "What are the biggest risks in my market right now?",
  "How should I find my first 10 customers?",
  "What should I focus on this week?",
  "Am I ready to raise a seed round?",
  "How would you stress-test my ICP?",
];

export function Council({ brain }: { brain: CompanyBrain }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeAgents, setActiveAgents] = useState<Set<AgentId>>(
    new Set(AGENTS.map((a) => a.id))
  );
  const [loading, setLoading] = useState(false);

  // Per-agent conversation history — kept in a ref so streaming closures always
  // see the latest value without stale captures
  const agentHistoryRef = useRef<Partial<Record<AgentId, ConversationTurn[]>>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load persisted transcript on mount
  useEffect(() => {
    const saved = loadTranscript(brain.startupName);
    if (saved.rounds.length > 0) {
      setRounds(saved.rounds);
      agentHistoryRef.current = buildAgentHistory(saved.rounds);
    }
  }, [brain.startupName]);

  // Auto-scroll to bottom when a new round is added
  useEffect(() => {
    if (rounds.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rounds.length]);

  const toggleAgent = useCallback((id: AgentId) => {
    setActiveAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRounds([]);
    agentHistoryRef.current = {};
    saveTranscript(brain.startupName, { rounds: [] });
  }, [brain.startupName]);

  const askCouncil = useCallback(
    async (question: string) => {
      if (loading) return;
      setLoading(true);

      const active = AGENTS.filter((a) => activeAgents.has(a.id));
      const roundId = uuidv4();

      // Kick off the round with loading placeholders
      const newRound: Round = {
        id: roundId,
        question,
        timestamp: Date.now(),
        responses: Object.fromEntries(
          active.map((a) => [a.id, { text: "", loading: true }])
        ) as Partial<Record<AgentId, RoundResponse>>,
      };

      setRounds((prev) => [...prev, newRound]);

      // Stream all agents in parallel
      await Promise.all(
        active.map((agent) =>
          streamAgent(
            agent,
            brain,
            question,
            agentHistoryRef.current[agent.id] ?? [],
            roundId
          )
        )
      );

      setLoading(false);
    },
    [loading, activeAgents, brain]
  );

  async function streamAgent(
    agent: AgentDef,
    brain: CompanyBrain,
    question: string,
    history: ConversationTurn[],
    roundId: string
  ) {
    let fullText = "";

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          brain,
          question,
          history: history.slice(-6), // last 3 user+assistant pairs
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const { text } = JSON.parse(data) as { text: string };
            fullText += text;
            setRounds((prev) =>
              prev.map((r) =>
                r.id === roundId
                  ? {
                      ...r,
                      responses: {
                        ...r.responses,
                        [agent.id]: { text: fullText, loading: true },
                      },
                    }
                  : r
              )
            );
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Mark complete
      setRounds((prev) => {
        const updated = prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                responses: {
                  ...r.responses,
                  [agent.id]: { text: fullText, loading: false },
                },
              }
            : r
        );
        // Persist to localStorage
        saveTranscript(brain.startupName, { rounds: updated });
        return updated;
      });

      // Append to this agent's history
      if (fullText) {
        const prev = agentHistoryRef.current[agent.id] ?? [];
        agentHistoryRef.current[agent.id] = [
          ...prev,
          { role: "user", content: question },
          { role: "assistant", content: fullText },
        ];
      }
    } catch (err) {
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                responses: {
                  ...r.responses,
                  [agent.id]: {
                    text: "",
                    loading: false,
                    error: err instanceof Error ? err.message : "Failed",
                  },
                },
              }
            : r
        )
      );
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <BrainBanner brain={brain} />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-60 border-r border-border flex-shrink-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
            <p className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Council
            </p>
            {AGENTS.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                active={activeAgents.has(agent.id)}
                onToggle={() => toggleAgent(agent.id)}
              />
            ))}

            {rounds.length > 0 && (
              <>
                <div className="my-3 border-t border-border" />
                <div className="flex items-center justify-between px-2 mb-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    History
                  </p>
                  <button
                    onClick={clearHistory}
                    title="Clear history"
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {[...rounds].reverse().slice(0, 8).map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      document
                        .getElementById(`round-${r.id}`)
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="group px-2 py-1.5 rounded-lg text-left hover:bg-accent/40 transition-colors"
                  >
                    <p className="text-[11px] text-muted-foreground group-hover:text-foreground truncate leading-relaxed flex items-center gap-1.5">
                      {i === 0 && loading && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                      )}
                      {r.question}
                    </p>
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* ── Main thread ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {rounds.length === 0 ? (
            <EmptyState brain={brain} onAsk={askCouncil} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10">
                {rounds.map((round, idx) => (
                  <RoundBlock
                    key={round.id}
                    round={round}
                    roundNumber={idx + 1}
                    id={`round-${round.id}`}
                  />
                ))}
                <div ref={bottomRef} className="h-2" />
              </div>
            </div>
          )}

          <QuestionBar onAsk={askCouncil} loading={loading} />
        </main>
      </div>
    </div>
  );
}

// ── Round block ────────────────────────────────────────────────────────────────

function RoundBlock({
  round,
  roundNumber,
  id,
}: {
  round: Round;
  roundNumber: number;
  id: string;
}) {
  const entries = Object.entries(round.responses) as [AgentId, RoundResponse][];

  return (
    <div id={id} className="flex flex-col gap-5 animate-fade-in">
      {/* Question bubble */}
      <div className="flex items-start justify-end gap-3">
        <div className="flex flex-col items-end gap-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium">
              Round {roundNumber}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(round.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="bg-primary/10 border border-primary/25 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm shadow-primary/5">
            <p className="text-sm text-foreground leading-relaxed">
              {round.question}
            </p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-6">
          <span className="text-xs font-bold text-primary">Y</span>
        </div>
      </div>

      {/* Agent responses */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {entries.map(([agentId, response]) => {
          const agent = AGENTS.find((a) => a.id === agentId);
          if (!agent) return null;
          return (
            <AgentResponse key={agentId} agent={agent} message={response} />
          );
        })}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({
  brain,
  onAsk,
}: {
  brain: CompanyBrain;
  onAsk: (q: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8 relative overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,hsl(210_100%_60%/0.06)_0%,transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Headline */}
      <div className="relative text-center max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 mb-5">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium tracking-wide">
            6 advisors standing by
          </span>
        </div>
        <h2 className="text-3xl font-bold text-foreground leading-tight">
          What&apos;s on your mind,{" "}
          <span className="text-primary">{brain.startupName}</span>?
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Your council debates every question in parallel — market research,
          devil&apos;s advocate, growth, ICP, GTM, and investor lens. All at once.
        </p>
      </div>

      {/* Prompt chips */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {DEFAULT_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            className="group flex items-start gap-2.5 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-left text-muted-foreground hover:text-foreground hover:border-primary/25 hover:bg-primary/5 transition-all duration-200"
          >
            <span className="text-primary/40 group-hover:text-primary transition-colors mt-0.5 flex-shrink-0">
              →
            </span>
            <span className="leading-snug">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
