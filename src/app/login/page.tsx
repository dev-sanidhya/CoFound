"use client";

import { useState } from "react";
import { Brain, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    // Hit the server action that sets state cookie and redirects to Claude OAuth
    window.location.href = "/api/auth/login";
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

      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CoFound</h1>
          <p className="text-sm text-muted-foreground text-center">
            Connect your Claude account to deploy your AI council
          </p>
        </div>

        {/* OAuth button */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Redirecting to Claude…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Continue with Claude
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center px-4">
            You&apos;ll be redirected to Claude to authorise CoFound. API usage
            is billed to your Anthropic account.
          </p>
        </div>

        {/* What you get */}
        <div className="w-full rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            After connecting
          </p>
          {[
            "Your AI council assembles instantly",
            "Agents read your startup context",
            "Debates, decisions, and execution begin",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
