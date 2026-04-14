"use client";

import { AgentDef } from "@/lib/agents";

interface Props {
  agent: AgentDef;
  active: boolean;
  onToggle: () => void;
}

export function AgentCard({ agent, active, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
        active
          ? `${agent.bgColor} ${agent.borderColor} border`
          : "hover:bg-accent/40 border border-transparent"
      }`}
    >
      <span className="text-base flex-shrink-0">{agent.emoji}</span>
      <div className="min-w-0">
        <p
          className={`text-xs font-medium truncate ${
            active ? agent.color : "text-muted-foreground"
          }`}
        >
          {agent.name}
        </p>
      </div>
      <div
        className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          active ? "bg-current opacity-60" : "bg-border"
        } ${active ? agent.color : ""}`}
      />
    </button>
  );
}
