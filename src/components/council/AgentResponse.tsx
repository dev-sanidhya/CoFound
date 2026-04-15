"use client";

import { useState, KeyboardEvent } from "react";
import { AgentDef } from "@/lib/agents";
import { RoundResponse } from "@/lib/transcript";
import { AlertCircle, CornerDownRight, ArrowUp } from "lucide-react";

interface Props {
  agent: AgentDef;
  message: RoundResponse;
  /** When provided, a follow-up input is shown once the response is complete. */
  onFollowUp?: (question: string) => void;
}

export function AgentResponse({ agent, message, onFollowUp }: Props) {
  const isStreaming = message.loading && message.text.length > 0;
  const isThinking = message.loading && message.text.length === 0;
  const isDone = !message.loading && !message.error && !!message.text;

  return (
    <div
      className={`
        flex flex-col rounded-2xl border overflow-hidden
        transition-all duration-300 bg-card
        ${agent.borderColor}
      `}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-4 py-3 ${agent.bgColor} border-b ${agent.borderColor}`}>
        <span className="text-xl leading-none flex-shrink-0">{agent.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-tight ${agent.color}`}>{agent.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{agent.tagline}</p>
        </div>

        {/* Status */}
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
            <span className={`text-[10px] font-medium ${agent.color} opacity-70`}>writing</span>
          </div>
        )}
        {isDone && (
          <span className="ml-auto text-[10px] text-muted-foreground font-medium">done</span>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 flex-1">
        {message.error ? (
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-xs leading-relaxed">{message.error}</span>
          </div>
        ) : isThinking ? (
          <ThinkingState />
        ) : (
          <ResponseText text={message.text} isStreaming={isStreaming} />
        )}
      </div>

      {/* ── Follow-up footer ──────────────────────────────────────────── */}
      {isDone && onFollowUp && (
        <FollowUpSection agent={agent} onSubmit={onFollowUp} />
      )}
    </div>
  );
}

// ── Follow-up section ──────────────────────────────────────────────────────────

function FollowUpSection({
  agent,
  onSubmit,
}: {
  agent: AgentDef;
  onSubmit: (q: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const q = value.trim();
    if (!q) return;
    onSubmit(q);
    setValue("");
    setOpen(false);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") setOpen(false);
  }

  if (!open) {
    return (
      <div className={`px-4 pb-3 border-t ${agent.borderColor} pt-2.5`}>
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${agent.color} opacity-50 hover:opacity-100`}
        >
          <CornerDownRight className="w-3 h-3" />
          Follow up with {agent.name.split(" ")[0]}
        </button>
      </div>
    );
  }

  return (
    <div className={`border-t ${agent.borderColor} px-3 pb-3 pt-2.5`}>
      <div
        className={`flex items-end gap-2 rounded-xl border ${agent.borderColor} ${agent.bgColor} px-3 py-2 focus-within:ring-1 focus-within:ring-current ${agent.color} transition-shadow`}
      >
        <textarea
          autoFocus
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
          placeholder={`Ask ${agent.name} a follow-up…`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
          style={{ maxHeight: "80px" }}
        />
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={submit}
            disabled={!value.trim()}
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
              value.trim()
                ? `${agent.bgColor} border ${agent.borderColor}`
                : "opacity-30"
            }`}
          >
            <ArrowUp className={`w-3 h-3 ${agent.color}`} />
          </button>
          <button
            onClick={() => { setOpen(false); setValue(""); }}
            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            esc
          </button>
        </div>
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

function ResponseText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const lines = text.split("\n");
  return (
    <div className={`flex flex-col gap-1.5 text-sm text-foreground leading-relaxed ${isStreaming ? "streaming-cursor" : ""}`}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        if (line.startsWith("### "))
          return <p key={i} className="font-semibold text-sm mt-2 mb-0.5">{renderInline(line.slice(4))}</p>;
        if (line.startsWith("## "))
          return <p key={i} className="font-bold text-base mt-3 mb-0.5">{renderInline(line.slice(3))}</p>;
        if (line.startsWith("# "))
          return <p key={i} className="font-bold text-lg mt-3 mb-1">{renderInline(line.slice(2))}</p>;

        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-primary mt-1.5 flex-shrink-0 text-[8px]">●</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );

        const numbered = line.match(/^(\d+)\.\s(.+)/);
        if (numbered)
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-primary/70 flex-shrink-0 font-semibold min-w-[1.4rem] text-xs mt-0.5">{numbered[1]}.</span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );

        if (line.trim() === "---" || line.trim() === "***")
          return <hr key={i} className="border-border my-1" />;

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
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="font-mono text-xs bg-accent/60 text-accent-foreground rounded px-1 py-0.5">{part.slice(1, -1)}</code>;
        return part;
      })}
    </>
  );
}
