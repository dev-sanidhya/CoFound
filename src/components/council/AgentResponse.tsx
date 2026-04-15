"use client";

import { AgentDef } from "@/lib/agents";
import { RoundResponse } from "@/lib/transcript";
import { AlertCircle } from "lucide-react";

interface Props {
  agent: AgentDef;
  message: RoundResponse;
}

export function AgentResponse({ agent, message }: Props) {
  const isStreaming = message.loading && message.text.length > 0;
  const isThinking = message.loading && message.text.length === 0;

  return (
    <div
      className={`
        flex flex-col rounded-2xl border overflow-hidden
        transition-all duration-300 bg-card
        ${agent.borderColor}
      `}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className={`
          flex items-center gap-3 px-4 py-3
          ${agent.bgColor} border-b ${agent.borderColor}
        `}
      >
        <span className="text-xl leading-none flex-shrink-0">{agent.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-tight ${agent.color}`}>
            {agent.name}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {agent.tagline}
          </p>
        </div>

        {/* Status indicator */}
        {isThinking && (
          <div className="ml-auto flex items-center gap-1">
            <span className={`thinking-dot w-1.5 h-1.5 rounded-full bg-current ${agent.color}`} />
            <span className={`thinking-dot w-1.5 h-1.5 rounded-full bg-current ${agent.color}`} />
            <span className={`thinking-dot w-1.5 h-1.5 rounded-full bg-current ${agent.color}`} />
          </div>
        )}
        {isStreaming && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full bg-current ${agent.color} animate-pulse`} />
            <span className={`text-[10px] font-medium ${agent.color} opacity-70`}>
              writing
            </span>
          </div>
        )}
        {!message.loading && !message.error && message.text && (
          <div className="ml-auto">
            <span className="text-[10px] text-muted-foreground font-medium">done</span>
          </div>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 flex-1">
        {message.error ? (
          <div className="flex items-start gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-xs leading-relaxed">{message.error}</span>
          </div>
        ) : isThinking ? (
          <ThinkingState />
        ) : (
          <ResponseText text={message.text} isStreaming={isStreaming} />
        )}
      </div>
    </div>
  );
}

// ── Skeleton thinking state ────────────────────────────────────────────────────

function ThinkingState() {
  return (
    <div className="flex flex-col gap-2.5 py-1">
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-5/6" />
      <div className="skeleton h-3 w-4/6" />
      <div className="skeleton h-3 w-full mt-1" />
      <div className="skeleton h-3 w-3/4" />
    </div>
  );
}

// ── Markdown text renderer ─────────────────────────────────────────────────────

function ResponseText({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const lines = text.split("\n");

  return (
    <div
      className={`flex flex-col gap-1.5 text-sm text-foreground leading-relaxed ${
        isStreaming ? "streaming-cursor" : ""
      }`}
    >
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        if (line.startsWith("### ")) {
          return (
            <p key={i} className="font-semibold text-foreground text-sm mt-2 mb-0.5">
              {renderInline(line.slice(4))}
            </p>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="font-bold text-foreground text-base mt-3 mb-0.5">
              {renderInline(line.slice(3))}
            </p>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <p key={i} className="font-bold text-foreground text-lg mt-3 mb-1">
              {renderInline(line.slice(2))}
            </p>
          );
        }

        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-primary mt-1.5 flex-shrink-0 text-[8px]">●</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }

        const numbered = line.match(/^(\d+)\.\s(.+)/);
        if (numbered) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-primary/70 flex-shrink-0 font-semibold min-w-[1.4rem] text-xs mt-0.5">
                {numbered[1]}.
              </span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );
        }

        if (line.trim() === "---" || line.trim() === "***") {
          return <hr key={i} className="border-border my-1" />;
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="font-mono text-xs bg-accent/60 text-accent-foreground rounded px-1 py-0.5"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}
