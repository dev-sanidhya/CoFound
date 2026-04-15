"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface Props {
  onAsk: (question: string) => void;
  loading: boolean;
}

export function QuestionBar({ onAsk, loading }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

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
    <div className="flex-shrink-0 px-4 pb-4 pt-2">
      <div
        className={`
          flex items-end gap-3 rounded-2xl border bg-card px-4 py-3
          transition-all duration-200
          ${loading
            ? "border-border opacity-80"
            : "border-border focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsl(210_100%_60%/0.08)]"
          }
        `}
      >
        <textarea
          ref={textareaRef}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
          placeholder={loading ? "Council is thinking…" : "Ask your council anything…"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          disabled={loading}
          style={{ minHeight: "24px", maxHeight: "120px" }}
        />

        <button
          onClick={submit}
          disabled={!value.trim() || loading}
          className={`
            flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
            transition-all duration-200
            ${value.trim() && !loading
              ? "bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20"
              : "bg-accent opacity-40"
            }
          `}
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          ) : (
            <ArrowUp className="w-3.5 h-3.5 text-primary-foreground" />
          )}
        </button>
      </div>

      <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
        <kbd className="font-mono">Enter</kbd> to send ·{" "}
        <kbd className="font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
