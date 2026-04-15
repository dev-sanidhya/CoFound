"use client";

import { useState } from "react";
import { Brain, Terminal, ClipboardPaste, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

type Step = "instructions" | "paste" | "validating" | "error";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("instructions");
  const [token, setToken] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConnect() {
    const t = token.trim();
    if (!t) return;
    setStep("validating");
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Invalid token — please try again.");
        setStep("error");
        return;
      }
      // Session cookie set by server — navigate to onboarding
      window.location.href = "/onboarding";
    } catch {
      setErrorMsg("Network error — check your connection and retry.");
      setStep("error");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Back link */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </Link>
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CoFound</h1>
          <p className="text-sm text-muted-foreground text-center">
            Connect your Claude account using a one-time setup token
          </p>
        </div>

        {/* Step 1 — Instructions */}
        <div className="w-full rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary-foreground">1</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              Generate your Claude token
            </p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Open your terminal and run this command. Requires{" "}
              <span className="text-foreground font-medium">Claude Code CLI</span>{" "}
              with a Max plan.
            </p>
            <div className="flex items-center gap-2.5 rounded-lg bg-background border border-border px-4 py-3">
              <Terminal className="w-4 h-4 text-primary flex-shrink-0" />
              <code className="text-sm font-mono text-foreground select-all">
                claude setup-token
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              This generates a 1-year OAuth bearer token. Copy the value shown — it
              starts with <code className="font-mono text-xs">sk-ant-oat</code> or similar.
            </p>
          </div>
        </div>

        {/* Step 2 — Paste token */}
        <div className="w-full rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary-foreground">2</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              Paste your token
            </p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <div className="flex items-end gap-2.5 rounded-xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-ring transition-shadow">
              <ClipboardPaste className="w-4 h-4 text-muted-foreground flex-shrink-0 mb-0.5" />
              <input
                type="password"
                placeholder="Paste your Claude token here…"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (step === "error") setStep("paste");
                }}
                onFocus={() => { if (step === "instructions") setStep("paste"); }}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Error state */}
            {step === "error" && (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={!token.trim() || step === "validating"}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {step === "validating" ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying token…
                </>
              ) : (
                <>
                  Connect to CoFound
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* What you get */}
        <div className="w-full flex flex-col gap-2">
          {[
            "Token is stored only in your browser session",
            "API usage is billed directly to your Anthropic account",
            "Your startup data never leaves your device",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
