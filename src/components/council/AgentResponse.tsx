"use client";

import { AgentDef } from "@/lib/agents";
import { AgentMessage } from "./Council";
import { AlertCircle } from "lucide-react";

interface Props {
  agent: AgentDef;
  message: AgentMessage;
}

export function AgentResponse({ agent, message }: Props) {
  return (
    <div
      className={`flex flex-col rounded-xl border bg-card overflow-hidden animate-fade-in ${agent.borderColor}`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-4 py-3 ${agent.bgColor}`}>
        <span className="text-lg">{agent.emoji}</span>
        <div>
          <p className={`text-sm font-semibold ${agent.color}`}>{agent.name}</p>
          <p className="text-xs text-muted-foreground">{agent.tagline}</p>
        </div>
        {message.loading && (
          <div className="ml-auto flex items-center gap-1">
            <span className={`thinking-dot w-1.5 h-1.5 rounded-full ${agent.color} bg-current`} />
            <span className={`thinking-dot w-1.5 h-1.5 rounded-full ${agent.color} bg-current`} />
            <span className={`thinking-dot w-1.5 h-1.5 rounded-full ${agent.color} bg-current`} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-4 flex-1">
        {message.error ? (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{message.error}</span>
          </div>
        ) : message.loading && !message.text ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>Thinking</span>
            <div className="flex items-center gap-1">
              <span className="thinking-dot w-1 h-1 rounded-full bg-current" />
              <span className="thinking-dot w-1 h-1 rounded-full bg-current" />
              <span className="thinking-dot w-1 h-1 rounded-full bg-current" />
            </div>
          </div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <ResponseText text={message.text} />
          </div>
        )}
      </div>
    </div>
  );
}

function ResponseText({ text }: { text: string }) {
  // Simple markdown-like rendering for bold, bullet points
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1.5 text-sm text-foreground leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Headers
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="font-semibold text-foreground text-base mt-2">
              {line.slice(3)}
            </p>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <p key={i} className="font-bold text-foreground text-lg mt-2">
              {line.slice(2)}
            </p>
          );
        }

        // Bullet points
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground mt-1.5 flex-shrink-0">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numbered = line.match(/^(\d+)\.\s(.+)/);
        if (numbered) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground flex-shrink-0 font-medium min-w-[1.2rem]">
                {numbered[1]}.
              </span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}
