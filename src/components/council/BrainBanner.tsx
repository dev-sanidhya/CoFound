"use client";

import { CompanyBrain } from "@/lib/brain";
import { Brain } from "lucide-react";

export function BrainBanner({ brain }: { brain: CompanyBrain }) {
  return (
    <div className="border-b border-border px-6 py-3 flex items-center gap-3 bg-accent/20 flex-shrink-0">
      <Brain className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-sm font-semibold text-foreground flex-shrink-0">
          {brain.startupName}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {brain.oneLiner}
        </span>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <Pill label="Stage" value={brain.fundingStage} />
        {brain.currentMrr && <Pill label="MRR" value={brain.currentMrr} />}
        {brain.userCount && <Pill label="Users" value={brain.userCount} />}
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}
