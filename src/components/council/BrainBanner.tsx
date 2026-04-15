"use client";

import { CompanyBrain } from "@/lib/brain";
import { Cpu } from "lucide-react";

export function BrainBanner({ brain }: { brain: CompanyBrain }) {
  return (
    <div className="flex-shrink-0 border-b border-border px-5 py-2.5 flex items-center gap-3 bg-card/50">
      {/* Icon */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-5 h-5 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center">
          <Cpu className="w-3 h-3 text-primary" />
        </div>
        <span className="text-xs font-bold text-foreground">{brain.startupName}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border flex-shrink-0" />

      {/* One-liner */}
      <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
        {brain.oneLiner}
      </span>

      {/* Pills */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Pill label="Stage" value={brain.fundingStage} />
        {brain.currentMrr && <Pill label="MRR" value={brain.currentMrr} />}
        {brain.userCount && <Pill label="Users" value={brain.userCount} />}
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-semibold text-foreground">{value}</span>
    </div>
  );
}
