"use client";

import { useState, useCallback } from "react";
import { CompanyBrain } from "@/lib/brain";
import { AGENTS, AgentDef, AgentId } from "@/lib/agents";
import { AgentCard } from "./AgentCard";
import { AgentResponse } from "./AgentResponse";
import { QuestionBar } from "./QuestionBar";
import { BrainBanner } from "./BrainBanner";

export interface AgentMessage {
  agentId: AgentId;
  text: string;
  loading: boolean;
  error?: string;
}

const DEFAULT_QUESTIONS = [
  "What are the biggest risks in my market right now?",
  "How should I find my first 10 customers?",
  "What should I focus on this week?",
  "Am I ready to raise a seed round?",
  "How would you stress-test my ICP?",
];

export function Council({ brain }: { brain: CompanyBrain }) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeAgents, setActiveAgents] = useState<Set<AgentId>>(
    new Set(AGENTS.map((a) => a.id))
  );
  const [loading, setLoading] = useState(false);

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

  const askCouncil = useCallback(
    async (question: string) => {
      if (loading) return;
      setLoading(true);

      const active = AGENTS.filter((a) => activeAgents.has(a.id));

      // Initialise loading state for each active agent
      setMessages(
        active.map((a) => ({ agentId: a.id, text: "", loading: true }))
      );

      // Fire all agents in parallel
      await Promise.all(
        active.map((agent) => streamAgent(agent, brain, question))
      );

      setLoading(false);
    },
    [loading, activeAgents, brain]
  );

  async function streamAgent(
    agent: AgentDef,
    brain: CompanyBrain,
    question: string
  ) {
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, brain, question }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

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
            setMessages((prev) =>
              prev.map((m) =>
                m.agentId === agent.id
                  ? { ...m, text: m.text + text, loading: false }
                  : m
              )
            );
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.agentId === agent.id
            ? {
                ...m,
                loading: false,
                error: err instanceof Error ? err.message : "Failed",
              }
            : m
        )
      );
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Company brain banner */}
      <BrainBanner brain={brain} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent selector sidebar */}
        <aside className="w-56 border-r border-border flex-shrink-0 overflow-y-auto p-3 flex flex-col gap-2">
          <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Your Council
          </p>
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              active={activeAgents.has(agent.id)}
              onToggle={() => toggleAgent(agent.id)}
            />
          ))}
        </aside>

        {/* Responses area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            <EmptyState brain={brain} onAsk={askCouncil} />
          ) : (
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
              {messages.map((msg) => {
                const agent = AGENTS.find((a) => a.id === msg.agentId)!;
                return (
                  <AgentResponse key={msg.agentId} agent={agent} message={msg} />
                );
              })}
            </div>
          )}

          {/* Question bar */}
          <QuestionBar onAsk={askCouncil} loading={loading} />
        </main>
      </div>
    </div>
  );
}

function EmptyState({
  brain,
  onAsk,
}: {
  brain: CompanyBrain;
  onAsk: (q: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-foreground">
          Your council is ready,{" "}
          <span className="text-primary">{brain.startupName}</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask anything — your agents will debate and respond in parallel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {DEFAULT_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-left text-muted-foreground hover:text-foreground hover:border-border/70 hover:bg-accent/50 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
