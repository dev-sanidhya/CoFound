"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brain, ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { saveBrain, loadBrain, CompanyBrain, FundingStage } from "@/lib/brain";

// ── Data ───────────────────────────────────────────────────────────────────────

const STAGES: { value: FundingStage; label: string; description: string }[] = [
  { value: "idea",      label: "Idea",      description: "Just an idea" },
  { value: "pre-seed",  label: "Pre-seed",  description: "Building MVP" },
  { value: "seed",      label: "Seed",      description: "Early traction" },
  { value: "series-a",  label: "Series A",  description: "Scaling" },
  { value: "series-b+", label: "Series B+", description: "Growth" },
];

const STEPS = [
  {
    id: 1,
    label: "The idea",
    title: "What are you building?",
    description: "Give your council the foundation — the clearer this is, the sharper the advice.",
  },
  {
    id: 2,
    label: "Your market",
    title: "Who is it for?",
    description: "A well-defined ICP unlocks better GTM, pricing, and positioning advice.",
  },
  {
    id: 3,
    label: "Traction",
    title: "Where are you now?",
    description: "Honest metrics help your council give stage-appropriate advice, not generic fluff.",
  },
  {
    id: 4,
    label: "Direction",
    title: "Where are you headed?",
    description: "Your 90-day goal and biggest challenge focus the entire council's output.",
  },
];

type FormData = Omit<CompanyBrain, "createdAt" | "updatedAt">;

const empty: FormData = {
  startupName: "", oneLiner: "", problem: "", solution: "",
  targetAudience: "", icp: "", marketSize: "",
  fundingStage: "idea", currentMrr: "", userCount: "", topMetric: "",
  gtmGoal: "", biggestChallenge: "", nextMilestone: "",
};

// Required fields per step
const REQUIRED: Record<number, (keyof FormData)[]> = {
  1: ["startupName", "oneLiner", "problem"],
  2: ["targetAudience", "icp"],
  3: ["topMetric"],
  4: ["gtmGoal", "biggestChallenge"],
};

// ── Field component ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  hasError?: boolean;
  maxLength?: number;
  rows?: number;
}

function Field({
  label, hint, value, onChange, placeholder,
  multiline, required, hasError, maxLength, rows = 3,
}: FieldProps) {
  const baseInput = [
    "w-full rounded-xl border bg-card px-4 py-3 text-sm text-foreground",
    "placeholder:text-muted-foreground focus:outline-none transition-all duration-200",
    hasError
      ? "border-destructive/60 focus:ring-2 focus:ring-destructive/20"
      : "border-border focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
  ].join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          {label}
          {required && <span className="text-primary text-xs">*</span>}
          {!required && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              optional
            </span>
          )}
        </label>
        {multiline && maxLength && (
          <span className={`text-[10px] flex-shrink-0 ${value.length > maxLength * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {/* Hint */}
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}

      {/* Input */}
      {multiline ? (
        <textarea
          className={`${baseInput} resize-none leading-relaxed`}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
        />
      ) : (
        <input
          type="text"
          className={baseInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}

      {/* Inline error */}
      {hasError && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          This field is required
        </p>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(empty);
  const [errorFields, setErrorFields] = useState<Set<keyof FormData>>(new Set());
  const [isEditing, setIsEditing] = useState(false);

  // Pre-fill if brain already exists (editing flow)
  useEffect(() => {
    const existing = loadBrain();
    if (existing) {
      const { createdAt: _c, updatedAt: _u, ...rest } = existing;
      setData(rest);
      setIsEditing(true);
    }
  }, []);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field as soon as user types
    setErrorFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function handleNext() {
    const required = REQUIRED[step] ?? [];
    const missing = required.filter((k) => !data[k]?.toString().trim());
    if (missing.length > 0) {
      setErrorFields(new Set(missing));
      return;
    }
    setErrorFields(new Set());
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrorFields(new Set());
    setStep((s) => s - 1);
  }

  function handleFinish() {
    const required = REQUIRED[step] ?? [];
    const missing = required.filter((k) => !data[k]?.toString().trim());
    if (missing.length > 0) {
      setErrorFields(new Set(missing));
      return;
    }
    const now = new Date().toISOString();
    saveBrain({
      ...data,
      createdAt: isEditing ? (loadBrain()?.createdAt ?? now) : now,
      updatedAt: now,
    });
    router.push("/dashboard");
  }

  const currentStep = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,hsl(210_100%_60%/0.04)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-lg flex flex-col gap-8">

        {/* ── Logo ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground">CoFound</span>
          {isEditing && (
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 ml-1">
              Editing brain
            </span>
          )}
        </div>

        {/* ── Step progress ─────────────────────────────────────────── */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                    s.id < step
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : s.id === step
                      ? "bg-primary/15 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {s.id < step ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                    s.id === step ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 mb-5 transition-colors duration-300 ${s.id < step ? "bg-primary/50" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step header ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold text-foreground">{currentStep.title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.description}</p>
        </div>

        {/* ── Fields ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {step === 1 && (
            <>
              <Field
                label="Startup name"
                value={data.startupName}
                onChange={(v) => set("startupName", v)}
                placeholder="e.g. CoFound"
                required
                hasError={errorFields.has("startupName")}
              />
              <Field
                label="One-liner"
                hint="Describe what you do in one sentence — no jargon."
                value={data.oneLiner}
                onChange={(v) => set("oneLiner", v)}
                placeholder="e.g. AI co-founder workspace for early-stage startups"
                required
                hasError={errorFields.has("oneLiner")}
              />
              <Field
                label="The problem"
                hint="What specific pain are you solving? Who feels it most?"
                value={data.problem}
                onChange={(v) => set("problem", v)}
                placeholder="Founders waste hours on strategy, research, and decision-making with no one to pressure-test their thinking..."
                multiline
                required
                hasError={errorFields.has("problem")}
                maxLength={400}
              />
              <Field
                label="Your solution"
                hint="How do you solve it differently or better than what exists?"
                value={data.solution}
                onChange={(v) => set("solution", v)}
                placeholder="A multi-agent AI platform that acts as an always-on co-founder — each agent has a distinct role..."
                multiline
                maxLength={400}
              />
            </>
          )}

          {step === 2 && (
            <>
              <Field
                label="Target audience"
                hint="Who buys or uses this? Be as specific as possible."
                value={data.targetAudience}
                onChange={(v) => set("targetAudience", v)}
                placeholder="e.g. Solo technical founders building B2B SaaS"
                required
                hasError={errorFields.has("targetAudience")}
              />
              <Field
                label="Ideal Customer Profile (ICP)"
                hint="Role, company size, tech stack, triggers — the more specific, the better the advice."
                value={data.icp}
                onChange={(v) => set("icp", v)}
                placeholder="Solo founder, technical background, pre-seed, building B2B SaaS, no co-founder, wants investor-level advice..."
                multiline
                required
                hasError={errorFields.has("icp")}
                maxLength={400}
              />
              <Field
                label="Market size"
                hint="Rough TAM/SAM estimate. Directionally right is fine."
                value={data.marketSize}
                onChange={(v) => set("marketSize", v)}
                placeholder="e.g. ~5M founders globally, $50B productivity market"
              />
            </>
          )}

          {step === 3 && (
            <>
              {/* Stage selector */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Funding stage</label>
                  <span className="text-primary text-xs">*</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => set("fundingStage", s.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center border transition-all duration-200 ${
                        data.fundingStage === s.value
                          ? "bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/10"
                          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                      }`}
                    >
                      <span className="text-xs font-bold">{s.label}</span>
                      <span className="text-[9px] opacity-60 leading-tight">{s.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Field
                label="Current MRR"
                hint="Monthly recurring revenue. Blank = pre-revenue."
                value={data.currentMrr}
                onChange={(v) => set("currentMrr", v)}
                placeholder="e.g. $0, $2,400/mo, $15K"
              />
              <Field
                label="User / customer count"
                value={data.userCount}
                onChange={(v) => set("userCount", v)}
                placeholder="e.g. 0, 50 beta users, 200 paying customers"
              />
              <Field
                label="Your most important metric"
                hint="The single number you obsessively track right now."
                value={data.topMetric}
                onChange={(v) => set("topMetric", v)}
                placeholder="e.g. Weekly signups, Demo-to-close rate, Day-30 retention"
                required
                hasError={errorFields.has("topMetric")}
              />
            </>
          )}

          {step === 4 && (
            <>
              <Field
                label="GTM goal — next 90 days"
                hint="What does success look like in 3 months? One clear outcome."
                value={data.gtmGoal}
                onChange={(v) => set("gtmGoal", v)}
                placeholder="Get to 50 paying customers, close first enterprise deal, hit $10K MRR..."
                multiline
                required
                hasError={errorFields.has("gtmGoal")}
                maxLength={300}
              />
              <Field
                label="Biggest challenge right now"
                hint="What's the one thing keeping you up at night? Don't sugarcoat it."
                value={data.biggestChallenge}
                onChange={(v) => set("biggestChallenge", v)}
                placeholder="Can't find a scalable acquisition channel. Activation rate is 20% and I don't know why..."
                multiline
                required
                hasError={errorFields.has("biggestChallenge")}
                maxLength={300}
              />
              <Field
                label="Next milestone"
                hint="The single most important thing to hit in the next 4–6 weeks."
                value={data.nextMilestone}
                onChange={(v) => set("nextMilestone", v)}
                placeholder="e.g. 10 paid pilots, seed round close, ship v2 with retention feature"
              />
            </>
          )}
        </div>

        {/* ── Required fields note ──────────────────────────────────── */}
        {errorFields.size > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">
              Please fill in the required fields above before continuing.
            </p>
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
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
              onClick={handleNext}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              Next step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              {isEditing ? "Update my council" : "Launch my council"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step indicator */}
        <p className="text-center text-xs text-muted-foreground">
          Step {step} of {STEPS.length} · Fields marked{" "}
          <span className="text-primary font-semibold">*</span> are required
        </p>
      </div>
    </div>
  );
}
