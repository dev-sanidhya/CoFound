import Link from "next/link";
import { Brain, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,hsl(210_100%_60%/0.05)_0%,transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6 text-center max-w-sm">
        {/* Logo */}
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Brain className="w-6 h-6 text-primary" />
        </div>

        {/* 404 */}
        <div>
          <p className="text-7xl font-black text-foreground/10 leading-none select-none">
            404
          </p>
          <h1 className="text-xl font-bold text-foreground mt-2">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            This page doesn&apos;t exist. Even your AI council couldn&apos;t find it.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to council
        </Link>

        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Home
        </Link>
      </div>
    </div>
  );
}
