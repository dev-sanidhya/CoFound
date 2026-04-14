/**
 * Company Brain — the persistent context that all agents share.
 * Stored in localStorage (client) and passed as context to every agent call.
 */

export type FundingStage =
  | "idea"
  | "pre-seed"
  | "seed"
  | "series-a"
  | "series-b+";

export interface CompanyBrain {
  // Core identity
  startupName: string;
  oneLiner: string;
  problem: string;
  solution: string;

  // Market
  targetAudience: string;
  icp: string; // Ideal Customer Profile
  marketSize: string;

  // Traction
  fundingStage: FundingStage;
  currentMrr: string;
  userCount: string;
  topMetric: string;

  // Direction
  gtmGoal: string;
  biggestChallenge: string;
  nextMilestone: string;

  // Meta
  createdAt: string;
  updatedAt: string;
}

export const BRAIN_STORAGE_KEY = "cofound_brain";

export function saveBrain(brain: CompanyBrain): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BRAIN_STORAGE_KEY, JSON.stringify(brain));
}

export function loadBrain(): CompanyBrain | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(BRAIN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CompanyBrain;
  } catch {
    return null;
  }
}

export function formatBrainForPrompt(brain: CompanyBrain): string {
  return `
## Company Brain: ${brain.startupName}

**One-liner:** ${brain.oneLiner}
**Problem:** ${brain.problem}
**Solution:** ${brain.solution}

**Target Audience:** ${brain.targetAudience}
**ICP:** ${brain.icp}
**Market Size:** ${brain.marketSize}

**Stage:** ${brain.fundingStage}
**MRR:** ${brain.currentMrr || "Pre-revenue"}
**Users:** ${brain.userCount || "0"}
**Key Metric:** ${brain.topMetric}

**GTM Goal:** ${brain.gtmGoal}
**Biggest Challenge:** ${brain.biggestChallenge}
**Next Milestone:** ${brain.nextMilestone}
`.trim();
}
