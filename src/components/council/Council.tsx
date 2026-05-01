"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CompanyBrain } from "@/lib/brain";
import { AGENTS, AgentDef, AgentId } from "@/lib/agents";
import {
  Round,
  RoundResponse,
  ConversationTurn,
  buildAgentHistory,
  downloadTranscript,
} from "@/lib/transcript";
import { AgentCard } from "./AgentCard";
import { AgentResponse } from "./AgentResponse";
import { ArtifactsPanel } from "./ArtifactsPanel";
import { QuestionBar } from "./QuestionBar";
import { BrainBanner } from "./BrainBanner";
import { Artifact } from "@/app/api/artifacts/route";
import { v4 as uuidv4 } from "uuid";
import {
  Sparkles,
  Trash2,
  Download,
  MessageSquare,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";

const DEFAULT_QUESTIONS = [
  "What are the biggest risks in my market right now?",
  "How should I find my first 10 customers?",
  "What should I focus on this week?",
  "Am I ready to raise a seed round?",
  "How would you stress-test my ICP?",
];

interface CouncilProps {
  brain: CompanyBrain;
  companyId: string;
}

export function Council({ brain, companyId }: CouncilProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeAgents, setActiveAgents] = useState<Set<AgentId>>(
    new Set(AGENTS.map((a) => a.id))
  );
  const [loading, setLoading] = useState(false);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [confirmingDeeper, setConfirmingDeeper] = useState<string | null>(null);

  const agentHistoryRef = useRef<Partial<Record<AgentId, ConversationTurn[]>>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load persisted rounds on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [roundsRes, artifactsRes] = await Promise.all([
          fetch(`/api/rounds?companyId=${companyId}`),
          fetch(`/api/artifacts?companyId=${companyId}`),
        ]);
        if (roundsRes.ok) {
          const { rounds: dbRounds } = await roundsRes.json();
          if (dbRounds.length > 0) {
            setRounds(dbRounds);
            agentHistoryRef.current = buildAgentHistory(dbRounds);
          }
        }
        if (artifactsRes.ok) {
          const { artifacts: dbArtifacts } = await artifactsRes.json();
          setArtifacts(dbArtifacts ?? []);
        }
      } finally {
        setLoadingRounds(false);
      }
    }
    loadData();
  }, [companyId]);

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

  const clearHistory = useCallback(async () => {
    setRounds([]);
    agentHistoryRef.current = {};
  }, []);

  const toggleArtifact = useCallback(async (id: string, completed: boolean) => {
    setArtifacts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed } : a))
    );
    await fetch("/api/artifacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed }),
    });
  }, []);

  // Parse synthesis text and save action items, risks, experiments as artifacts
  async function extractAndSaveArtifacts(
    roundId: string,
    synthesisText: string
  ) {
    const items: { type: "action" | "risk" | "experiment"; content: string }[] = [];

    // Extract numbered items under DECISION section
    const decisionMatch = synthesisText.match(
      /\*\*DECISION\*\*[\s\S]*?(?=\*\*THE ONE THING\*\*|\*\*TENSIONS\*\*|\*\*CONSENSUS\*\*|$)/i
    );
    if (decisionMatch) {
      const numberedRe = /^\d+\.\s+(.+)$/gm;
      let m: RegExpExecArray | null;
      while ((m = numberedRe.exec(decisionMatch[0])) !== null) {
        if (m[1].trim()) items.push({ type: "action", content: m[1].trim() });
      }
    }

    // Extract bullet items under TENSIONS section as risks
    const tensionsMatch = synthesisText.match(
      /\*\*TENSIONS\*\*[\s\S]*?(?=\*\*DECISION\*\*|\*\*CONSENSUS\*\*|\*\*THE ONE THING\*\*|$)/i
    );
    if (tensionsMatch) {
      const bulletRe = /^[-•]\s+(.+)$/gm;
      let m: RegExpExecArray | null;
      while ((m = bulletRe.exec(tensionsMatch[0])) !== null) {
        if (m[1].trim()) items.push({ type: "risk", content: m[1].trim() });
      }
    }

    if (items.length === 0) return;

    try {
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, roundId, items }),
      });
      if (res.ok) {
        const { artifacts: newArtifacts } = await res.json();
        setArtifacts((prev) => [...prev, ...newArtifacts]);
      }
    } catch { /* non-fatal */ }
  }

  // ── SSE stream helper ──────────────────────────────────────────────────────
  async function streamFromEndpoint(
    endpoint: string,
    body: Record<string, unknown>,
    roundId: string,
    agentId: AgentId,
    responseField: "responses" | "debateResponses"
  ): Promise<string> {
    let fullText = "";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
                      [responseField]: {
                        ...r[responseField],
                        [agentId]: { text: fullText, loading: true },
                      },
                    }
                  : r
              )
            );
          } catch { /* skip malformed chunk */ }
        }
      }

      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                [responseField]: {
                  ...r[responseField],
                  [agentId]: { text: fullText, loading: false },
                },
              }
            : r
        )
      );
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                [responseField]: {
                  ...r[responseField],
                  [agentId]: {
                    text: "",
                    loading: false,
                    error: isTimeout ? "Request timed out — try again." : (err instanceof Error ? err.message : "Failed"),
                  },
                },
              }
            : r
        )
      );
    }

    return fullText;
  }

  // ── Wave 1 — ask all active agents ────────────────────────────────────────
  const askCouncil = useCallback(
    async (question: string) => {
      if (loading) return;
      setLoading(true);

      const active = AGENTS.filter((a) => activeAgents.has(a.id));
      const roundId = uuidv4();

      const newRound: Round = {
        id: roundId,
        question,
        timestamp: Date.now(),
        responses: Object.fromEntries(
          active.map((a) => [a.id, { text: "", loading: true }])
        ) as Partial<Record<AgentId, RoundResponse>>,
        wave1Complete: false,
        debateTriggered: false,
        debateResponses: {},
        debateComplete: false,
      };

      setRounds((prev) => [...prev, newRound]);

      // Persist round to DB
      await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, companyId, question }),
      });

      // Stream all active agents in parallel
      const results = await Promise.all(
        active.map(async (agent) => {
          const text = await streamFromEndpoint(
            "/api/agent",
            {
              agentId: agent.id,
              brain,
              question,
              history: (agentHistoryRef.current[agent.id] ?? []).slice(-6),
              roundId,
            },
            roundId,
            agent.id,
            "responses"
          );
          return { agentId: agent.id, text };
        })
      );

      // Update agent history
      for (const { agentId, text } of results) {
        if (text) {
          const prev = agentHistoryRef.current[agentId] ?? [];
          agentHistoryRef.current[agentId] = [
            ...prev,
            { role: "user", content: question },
            { role: "assistant", content: text },
          ];
        }
      }

      // Mark Wave 1 complete
      setRounds((prev) =>
        prev.map((r) => (r.id === roundId ? { ...r, wave1Complete: true } : r))
      );
      await fetch("/api/rounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, wave1_complete: true }),
      });

      setLoading(false);
    },
    [loading, activeAgents, brain, companyId]
  );

  // ── Follow-up — ask a single agent ────────────────────────────────────────
  const askOneAgent = useCallback(
    async (agentId: AgentId, question: string) => {
      if (loading) return;
      setLoading(true);

      const roundId = uuidv4();
      const newRound: Round = {
        id: roundId,
        question,
        timestamp: Date.now(),
        directedTo: agentId,
        responses: { [agentId]: { text: "", loading: true } } as Partial<Record<AgentId, RoundResponse>>,
        wave1Complete: false,
        debateTriggered: false,
        debateResponses: {},
        debateComplete: false,
      };

      setRounds((prev) => [...prev, newRound]);

      await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, companyId, question, directedTo: agentId }),
      });

      const text = await streamFromEndpoint(
        "/api/agent",
        {
          agentId,
          brain,
          question,
          history: (agentHistoryRef.current[agentId] ?? []).slice(-6),
          roundId,
        },
        roundId,
        agentId,
        "responses"
      );

      if (text) {
        const prev = agentHistoryRef.current[agentId] ?? [];
        agentHistoryRef.current[agentId] = [
          ...prev,
          { role: "user", content: question },
          { role: "assistant", content: text },
        ];
      }

      setRounds((prev) =>
        prev.map((r) => (r.id === roundId ? { ...r, wave1Complete: true } : r))
      );

      setLoading(false);
    },
    [loading, brain, companyId]
  );

  // ── Wave 1-only synthesis ──────────────────────────────────────────────────
  const synthesizeWave1Only = useCallback(
    async (roundId: string) => {
      if (loading) return;
      const round = rounds.find((r) => r.id === roundId);
      if (!round || round.synthesis || round.synthesisLoading) return;

      const wave1Responses: Partial<Record<AgentId, string>> = {};
      for (const [id, resp] of Object.entries(round.responses)) {
        if (resp?.text) wave1Responses[id as AgentId] = resp.text;
      }
      setLoading(true);
      await runSynthesis(roundId, round.question, wave1Responses, {});
      setLoading(false);
    },
    [loading, rounds, brain] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Wave 2 — debate ────────────────────────────────────────────────────────
  const goDeeper = useCallback(
    async (roundId: string) => {
      if (loading) return;

      const round = rounds.find((r) => r.id === roundId);
      if (!round || round.debateTriggered) return;

      setConfirmingDeeper(null);
      setLoading(true);

      const allWave1Responses: Partial<Record<AgentId, string>> = {};
      for (const [id, resp] of Object.entries(round.responses)) {
        if (resp?.text) allWave1Responses[id as AgentId] = resp.text;
      }

      const activeInRound = AGENTS.filter((a) => round.responses[a.id]);

      // Mark debate triggered
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                debateTriggered: true,
                debateResponses: Object.fromEntries(
                  activeInRound.map((a) => [a.id, { text: "", loading: true }])
                ) as Partial<Record<AgentId, RoundResponse>>,
              }
            : r
        )
      );
      await fetch("/api/rounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, debate_triggered: true }),
      });

      // Stream all debate responses in parallel
      const debateResults = await Promise.all(
        activeInRound.map(async (agent) => {
          const text = await streamFromEndpoint(
            "/api/debate",
            {
              agentId: agent.id,
              brain,
              question: round.question,
              history: (agentHistoryRef.current[agent.id] ?? []).slice(-4),
              roundId,
              allWave1Responses,
            },
            roundId,
            agent.id,
            "debateResponses"
          );
          return { agentId: agent.id, text };
        })
      );

      // Mark debate complete
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId ? { ...r, debateComplete: true } : r
        )
      );
      await fetch("/api/rounds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, debate_complete: true }),
      });

      // Auto-run synthesis
      const allDebateResponses: Partial<Record<AgentId, string>> = {};
      for (const { agentId, text } of debateResults) {
        if (text) allDebateResponses[agentId] = text;
      }
      await runSynthesis(roundId, round.question, allWave1Responses, allDebateResponses);

      setLoading(false);
    },
    [loading, rounds, brain]
  );

  // ── Synthesis ──────────────────────────────────────────────────────────────
  async function runSynthesis(
    roundId: string,
    question: string,
    allWave1Responses: Partial<Record<AgentId, string>>,
    allDebateResponses: Partial<Record<AgentId, string>>
  ) {
    setRounds((prev) =>
      prev.map((r) =>
        r.id === roundId ? { ...r, synthesisLoading: true } : r
      )
    );

    let fullText = "";
    try {
      const res = await fetch("/api/synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId,
          brain,
          question,
          allWave1Responses,
          allDebateResponses,
        }),
      });

      if (!res.ok) throw new Error("Synthesis failed");

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
                r.id === roundId ? { ...r, synthesis: fullText } : r
              )
            );
          } catch { /* skip */ }
        }
      }
    } catch { /* synthesis failure is non-fatal */ }

    setRounds((prev) =>
      prev.map((r) =>
        r.id === roundId
          ? { ...r, synthesisLoading: false, synthesisComplete: true }
          : r
      )
    );

    if (fullText) {
      await extractAndSaveArtifacts(roundId, fullText);
    }
  }

  if (loadingRounds) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your council...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <BrainBanner brain={brain} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
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

            {artifacts.length > 0 && (
              <>
                <div className="my-3 border-t border-border" />
                <ArtifactsPanel artifacts={artifacts} onToggle={toggleArtifact} />
              </>
            )}

            {rounds.length > 0 && (
              <>
                <div className="my-3 border-t border-border" />
                <div className="flex items-center justify-between px-2 mb-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    History
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadTranscript(brain, rounds)}
                      title="Export transcript"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={clearHistory}
                      title="Clear history"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {[...rounds].reverse().slice(0, 8).map((r, i) => {
                  const directed = r.directedTo
                    ? AGENTS.find((a) => a.id === r.directedTo)
                    : null;
                  return (
                    <button
                      key={r.id}
                      onClick={() =>
                        document.getElementById(`round-${r.id}`)?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="group px-2 py-1.5 rounded-lg text-left hover:bg-accent/40 transition-colors"
                    >
                      <p className="text-[11px] text-muted-foreground group-hover:text-foreground truncate leading-relaxed flex items-center gap-1.5">
                        {i === 0 && loading && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                        )}
                        {directed && (
                          <span className="text-[9px] opacity-60 flex-shrink-0">{directed.emoji}</span>
                        )}
                        {r.question}
                      </p>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </aside>

        {/* Main thread */}
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
                    councilLoading={loading}
                    onFollowUp={(agentId, question) => askOneAgent(agentId, question)}
                    onGoDeeper={() => setConfirmingDeeper(round.id)}
                    onSynthesizeNow={() => synthesizeWave1Only(round.id)}
                    isConfirmingDeeper={confirmingDeeper === round.id}
                    onCancelDeeper={() => setConfirmingDeeper(null)}
                    onConfirmDeeper={() => goDeeper(round.id)}
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
  councilLoading,
  onFollowUp,
  onGoDeeper,
  onSynthesizeNow,
  isConfirmingDeeper,
  onCancelDeeper,
  onConfirmDeeper,
}: {
  round: Round;
  roundNumber: number;
  id: string;
  councilLoading: boolean;
  onFollowUp: (agentId: AgentId, question: string) => void;
  onGoDeeper: () => void;
  onSynthesizeNow: () => void;
  isConfirmingDeeper: boolean;
  onCancelDeeper: () => void;
  onConfirmDeeper: () => void;
}) {
  const wave1Entries = Object.entries(round.responses) as [AgentId, RoundResponse][];
  const wave2Entries = Object.entries(round.debateResponses) as [AgentId, RoundResponse][];
  const directedAgent = round.directedTo
    ? AGENTS.find((a) => a.id === round.directedTo)
    : null;

  const allWave1Done =
    round.wave1Complete &&
    wave1Entries.every(([, r]) => !r.loading);

  const canGoDeeper =
    allWave1Done &&
    !round.directedTo &&
    !round.debateTriggered &&
    !councilLoading;

  const canSynthesizeNow =
    allWave1Done &&
    !round.directedTo &&
    !round.synthesis &&
    !round.synthesisLoading &&
    !councilLoading;

  return (
    <div id={id} className="flex flex-col gap-5 animate-fade-in">
      {/* Question bubble */}
      <div className="flex items-start justify-end gap-3">
        <div className="flex flex-col items-end gap-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            {directedAgent && (
              <span className="text-[10px] text-muted-foreground">
                → {directedAgent.emoji} {directedAgent.name}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-medium">
              Round {roundNumber}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(round.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="bg-primary/10 border border-primary/25 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm shadow-primary/5">
            <p className="text-sm text-foreground leading-relaxed">{round.question}</p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-6">
          <span className="text-xs font-bold text-primary">Y</span>
        </div>
      </div>

      {/* Wave 1 responses */}
      {wave1Entries.length > 0 && (
        <div className="flex flex-col gap-3">
          {!directedAgent && (
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
              Wave 1 — Independent Analysis
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {wave1Entries.map(([agentId, response]) => {
              const agent = AGENTS.find((a) => a.id === agentId);
              if (!agent) return null;
              return (
                <AgentResponse
                  key={agentId}
                  agent={agent}
                  message={response}
                  onFollowUp={
                    !councilLoading && !response.loading
                      ? (question) => onFollowUp(agentId, question)
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons: Synthesize Wave 1 / Go Deeper */}
      {(canGoDeeper || canSynthesizeNow) && !isConfirmingDeeper && (
        <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
          {canSynthesizeNow && (
            <button
              onClick={onSynthesizeNow}
              className="group flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 px-4 py-2.5 text-sm font-medium text-primary transition-all duration-200"
            >
              <Sparkles className="w-4 h-4" />
              Synthesize Wave 1
              <span className="text-[10px] text-primary/60 font-normal">1 call</span>
            </button>
          )}
          {canGoDeeper && (
            <button
              onClick={onGoDeeper}
              className="group flex items-center gap-2.5 rounded-xl border border-orange-400/30 bg-orange-400/5 hover:bg-orange-400/10 hover:border-orange-400/50 px-5 py-2.5 text-sm font-medium text-orange-400 transition-all duration-200"
            >
              <MessageSquare className="w-4 h-4" />
              Go Deeper — Start the Debate
              <span className="text-[10px] text-orange-400/60 font-normal">Wave 2</span>
            </button>
          )}
        </div>
      )}

      {/* Cost confirmation for Go Deeper */}
      {isConfirmingDeeper && (
        <div className="rounded-xl border border-orange-400/30 bg-orange-400/[0.05] p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">Start the Debate?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Wave 2 runs 6 Opus calls in parallel — each advisor reads all Wave 1 responses and reacts. This is the most expensive step (~6x the cost of Wave 1). After Wave 2, synthesis runs automatically.
              </p>
            </div>
            <button onClick={onCancelDeeper} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onCancelDeeper}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/30"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmDeeper}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-orange-400/15 hover:bg-orange-400/25 border border-orange-400/30 text-orange-400 text-xs font-semibold transition-all"
            >
              <MessageSquare className="w-3 h-3" />
              Start Debate
            </button>
          </div>
        </div>
      )}

      {/* Wave 2 — Debate */}
      {round.debateTriggered && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <p className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">
              Wave 2 — The Debate
            </p>
            {!round.debateComplete && (
              <Loader2 className="w-3 h-3 text-orange-400/60 animate-spin" />
            )}
          </div>
          <div className="rounded-xl border border-orange-400/15 bg-orange-400/[0.03] p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {wave2Entries.map(([agentId, response]) => {
                const agent = AGENTS.find((a) => a.id === agentId);
                if (!agent) return null;
                return (
                  <AgentResponse
                    key={agentId}
                    agent={agent}
                    message={response}
                    compact
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Synthesis */}
      {(round.synthesis || round.synthesisLoading) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">
              Council Synthesis
            </p>
            {round.synthesisLoading && !round.synthesisComplete && (
              <Loader2 className="w-3 h-3 text-primary/60 animate-spin" />
            )}
          </div>
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] p-5">
            {round.synthesis ? (
              <SynthesisContent text={round.synthesis} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Synthesizing council perspectives...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Synthesis content renderer ─────────────────────────────────────────────────

function SynthesisContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1.5 text-sm text-foreground leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
          return (
            <p key={i} className="font-bold text-primary mt-2 first:mt-0">
              {line.slice(2, -2)}
            </p>
          );
        }
        if (line.startsWith("**") && line.includes("**")) {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i}>
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j} className="font-semibold text-foreground">
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <p key={i} className="pl-3 flex gap-2">
              <span className="text-primary/60 flex-shrink-0">·</span>
              {line.slice(2)}
            </p>
          );
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ brain, onAsk }: { brain: CompanyBrain; onAsk: (q: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8 relative overflow-hidden">
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

      <div className="relative text-center max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 mb-5">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium tracking-wide">6 advisors standing by</span>
        </div>
        <h2 className="text-3xl font-bold text-foreground leading-tight">
          What&apos;s on your mind,{" "}
          <span className="text-primary">{brain.startupName}</span>?
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Ask anything. Get independent analysis from 6 advisors, then trigger the debate to make them react to each other.
        </p>
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {DEFAULT_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            className="group flex items-start gap-2.5 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-left text-muted-foreground hover:text-foreground hover:border-primary/25 hover:bg-primary/5 transition-all duration-200"
          >
            <span className="text-primary/40 group-hover:text-primary transition-colors mt-0.5 flex-shrink-0">→</span>
            <span className="leading-snug">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
