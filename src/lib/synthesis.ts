import { CompanyBrain, formatBrainForPrompt } from "./brain";
import { AgentId, AGENTS } from "./agents";

export function buildSynthesisPrompt(
  brain: CompanyBrain,
  question: string,
  wave1: Partial<Record<AgentId, string>>,
  debateResponses: Partial<Record<AgentId, string>>
): string {
  const formatWave = (responses: Partial<Record<AgentId, string>>) =>
    AGENTS.filter((a) => responses[a.id])
      .map((a) => `### ${a.emoji} ${a.name}\n${responses[a.id]}`)
      .join("\n\n");

  return `
You are the Synthesis Engine for ${brain.startupName}'s advisory council.

The council just ran a two-wave deliberation on this question:
"${question}"

${formatBrainForPrompt(brain)}

---

## WAVE 1 — Independent Analysis

${formatWave(wave1)}

---

## WAVE 2 — The Debate

${formatWave(debateResponses)}

---

Now synthesize. Your output must follow this exact structure:

**CONSENSUS**
What do the advisors fundamentally agree on? 2-3 points of genuine alignment only — these are the strongest signals the founder should act on.

**TENSIONS**
Where do advisors meaningfully conflict? For each tension, explain what it means strategically for ${brain.startupName}. Don't smooth over disagreements — they contain information.

**DECISION**
What should ${brain.startupName} actually do? Give exactly 3 prioritized actions, ordered by impact vs effort. Specific enough to act on Monday morning. No vague advice.

**THE ONE THING**
If you could tell this founder only one thing right now, what is it? One sentence. Make it count.

Rules: write in second person. Cut all filler. A founder should read this in 90 seconds and know exactly what to do next.
`.trim();
}
