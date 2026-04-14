"use client";

import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface Props {
  onAsk: (question: string) => void;
  loading: boolean;
}

export function QuestionBar({ onAsk, loading }: Props) {
  const [value, setValue] = useState("");

  function submit() {
    const q = value.trim();
    if (!q || loading) return;
    setValue("");
    onAsk(q);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-border p-4 flex-shrink-0">
      <div className="flex items-end gap-3 rounded-xl border border-border bg-card px-4 py-3 focus-within:ring-2 focus-within:ring-ring transition-shadow">
        <textarea
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[20px] max-h-[120px]"
          placeholder="Ask your council anything about your startup…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          style={{ height: "auto" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || loading}
          className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5 text-primary-foreground" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground text-center">
        Press <kbd className="font-mono">Enter</kbd> to send ·{" "}
        <kbd className="font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
