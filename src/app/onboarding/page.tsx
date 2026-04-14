"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { saveBrain, CompanyBrain, FundingStage } from "@/lib/brain";

const STAGES: { value: FundingStage; label: string }[] = [
  { value: "idea", label: "Just an idea" },
  { value: "pre-seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "series-b+", label: "Series B+" },
];

type Step = {
  id: number;
  title: string;
  subtitle: string;
};

const STEPS: Step[] = [
  { id: 1, title: "The idea", subtitle: "What are you building?" },
  { id: 2, title: "Your market", subtitle: "Who is it for?" },
  { id: 3, title: "Traction", subtitle: "Where are you now?" },
  { id: 4, title: "Direction", subtitle: "Where are you headed?" },
];

const empty: Omit<CompanyBrain, "createdAt" | "updatedAt"> = {
  startupName: "",
  oneLiner: "",
  problem: "",
  solution: "",
  targetAudience: "",
  icp: "",
  marketSize: "",
  fundingStage: "idea",
  currentMrr: "",
  userCount: "",
  topMetric: "",
  gtmGoal: "",
  biggestChallenge: "",
  nextMilestone: "",
};

function Field({
  label,
  hint,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {multiline ? (
        <textarea
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState(empty);

  function set<K extends keyof typeof empty>(key: K, value: typeof empty[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 1) return !!data.startupName && !!data.oneLiner && !!data.problem;
    if (step === 2) return !!data.targetAudience && !!data.icp;
    if (step === 3) return !!data.topMetric;
    if (step === 4) return !!data.gtmGoal && !!data.biggestChallenge;
    return true;
  }

  function handleFinish() {
    const now = new Date().toISOString();
    saveBrain({ ...data, createdAt: now, updatedAt: now });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">CoFound</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 transition-colors ${
                  s.id < step
                    ? "bg-primary text-primary-foreground"
                    : s.id === step
                    ? "bg-primary/20 text-primary border border-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.id < step ? <Check className="w-3 h-3" /> : s.id}
              </div>
              {s.id < STEPS.length && (
                <div
                  className={`flex-1 h-px transition-colors ${
                    s.id < step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">
            {STEPS[step - 1].title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {STEPS[step - 1].subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {step === 1 && (
            <>
              <Field
                label="Startup name"
                value={data.startupName}
                onChange={(v) => set("startupName", v)}
                placeholder="e.g. CoFound"
              />
              <Field
                label="One-liner"
                hint="How you'd describe it to a stranger in one sentence"
                value={data.oneLiner}
                onChange={(v) => set("oneLiner", v)}
                placeholder="e.g. AI co-founder workspace for early-stage startups"
              />
              <Field
                label="The problem"
                hint="What pain are you solving?"
                value={data.problem}
                onChange={(v) => set("problem", v)}
                multiline
                placeholder="Founders spend too much time on research, strategy, and execution planning..."
              />
              <Field
                label="Your solution"
                value={data.solution}
                onChange={(v) => set("solution", v)}
                multiline
                placeholder="A multi-agent AI platform that acts as an always-on co-founder..."
              />
            </>
          )}

          {step === 2 && (
            <>
              <Field
                label="Target audience"
                hint="Who buys this?"
                value={data.targetAudience}
                onChange={(v) => set("targetAudience", v)}
                placeholder="e.g. Early-stage B2B SaaS founders, solo founders"
              />
              <Field
                label="Ideal Customer Profile (ICP)"
                hint="Be specific — role, company size, situation"
                value={data.icp}
                onChange={(v) => set("icp", v)}
                multiline
                placeholder="Solo technical founders, pre-seed, building B2B SaaS, limited time for strategy..."
              />
              <Field
                label="Market size"
                hint="TAM / SAM estimate (rough is fine)"
                value={data.marketSize}
                onChange={(v) => set("marketSize", v)}
                placeholder="e.g. ~5M founders globally, $50B productivity market"
              />
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">
                  Funding stage
                </label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => set("fundingStage", s.value)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                        data.fundingStage === s.value
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field
                label="Current MRR"
                hint="Monthly recurring revenue (leave blank if pre-revenue)"
                value={data.currentMrr}
                onChange={(v) => set("currentMrr", v)}
                placeholder="e.g. $0, $2,000, $15K"
              />
              <Field
                label="User / customer count"
                value={data.userCount}
                onChange={(v) => set("userCount", v)}
                placeholder="e.g. 0, 50 beta users, 200 paying customers"
              />
              <Field
                label="Your most important metric right now"
                hint="The one number you track obsessively"
                value={data.topMetric}
                onChange={(v) => set("topMetric", v)}
                placeholder="e.g. Weekly signups, Demo conversion rate, NPS"
              />
            </>
          )}

          {step === 4 && (
            <>
              <Field
                label="GTM goal (next 90 days)"
                hint="What does success look like in 3 months?"
                value={data.gtmGoal}
                onChange={(v) => set("gtmGoal", v)}
                multiline
                placeholder="Get to 50 paying customers, launch on Product Hunt, close first enterprise deal..."
              />
              <Field
                label="Biggest challenge right now"
                hint="What's the one thing keeping you up at night?"
                value={data.biggestChallenge}
                onChange={(v) => set("biggestChallenge", v)}
                multiline
                placeholder="Finding the right distribution channel, improving activation rate..."
              />
              <Field
                label="Next milestone"
                value={data.nextMilestone}
                onChange={(v) => set("nextMilestone", v)}
                placeholder="e.g. $10K MRR, 100 users, seed round close"
              />
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canAdvance()}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Launch my council
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
