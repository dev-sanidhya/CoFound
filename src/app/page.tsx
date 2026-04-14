import Link from "next/link";
import { ArrowRight, Brain, Users, Zap, TrendingUp, Shield, Lightbulb } from "lucide-react";

const agents = [
  { icon: TrendingUp, label: "Market Research", color: "text-blue-400", bg: "bg-blue-400/10" },
  { icon: Shield, label: "Devil's Advocate", color: "text-red-400", bg: "bg-red-400/10" },
  { icon: Zap, label: "Growth Agent", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { icon: Users, label: "ICP Analyst", color: "text-green-400", bg: "bg-green-400/10" },
  { icon: Lightbulb, label: "GTM Strategist", color: "text-purple-400", bg: "bg-purple-400/10" },
  { icon: Brain, label: "Investor Lens", color: "text-orange-400", bg: "bg-orange-400/10" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">CoFound</span>
        </div>
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/30 px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          AI Operating System for Founders
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground max-w-4xl">
          Your AI{" "}
          <span className="text-primary">co-founder</span>{" "}
          that never sleeps
        </h1>

        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
          Deploy a council of AI agents that research your market, challenge your
          assumptions, plan your GTM, and execute decisions — all trained on your
          startup&apos;s context.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            See how it works
          </Link>
        </div>

        {/* Agent cards preview */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full">
          {agents.map(({ icon: Icon, label, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left"
            >
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-sm text-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            How CoFound works
          </h2>
          <p className="text-center text-muted-foreground mb-16">
            Three steps to your AI council
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Brief your startup",
                desc: "Tell CoFound about your idea, target customer, traction, and goals. This becomes your Company Brain.",
              },
              {
                step: "02",
                title: "Council assembles",
                desc: "Specialised agents activate — each with a unique perspective. They read your brain and start working immediately.",
              },
              {
                step: "03",
                title: "Debate → Decision → Execute",
                desc: "Agents surface insights, debate options, and recommend actions. You decide, they execute.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col gap-3">
                <span className="text-4xl font-bold text-border">{step}</span>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Ready to build smarter?
        </h2>
        <p className="text-muted-foreground mb-8">
          Connect your Claude account and deploy your council in minutes.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Start for free
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        CoFound © 2025 — Built with Claude
      </footer>
    </main>
  );
}
