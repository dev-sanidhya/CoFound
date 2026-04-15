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
      className={`
        w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left
        transition-all duration-200 group
        ${active
          ? `${agent.bgColor} ${agent.borderColor} border`
          : "border border-transparent hover:bg-accent/30"
        }
      `}
    >
      {/* Emoji */}
      <span
        className={`text-base flex-shrink-0 transition-transform duration-200 ${
          active ? "scale-110" : "group-hover:scale-105"
        }`}
      >
        {agent.emoji}
      </span>

      {/* Labels */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs font-semibold truncate transition-colors ${
            active ? agent.color : "text-muted-foreground group-hover:text-foreground"
          }`}
        >
          {agent.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">
          {agent.tagline}
        </p>
      </div>

      {/* Active dot */}
      {active && (
        <div
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current ${agent.color} opacity-70`}
        />
      )}
    </button>
  );
}
