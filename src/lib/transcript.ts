/**
 * Council transcript — persists rounds to localStorage per startup.
 */

import { AgentId, AGENTS } from "./agents";
import { CompanyBrain } from "./brain";

export interface RoundResponse {
  text: string;
  loading: boolean;
  error?: string;
}

export interface Round {
  id: string;
  question: string;
  timestamp: number;
  /** When set, this round was a directed follow-up to a specific agent */
  directedTo?: AgentId;
  responses: Partial<Record<AgentId, RoundResponse>>;
}

export interface Transcript {
  rounds: Round[];
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

function storageKey(startupName: string): string {
  return `cofound_transcript_${startupName.toLowerCase().replace(/\s+/g, "_")}`;
}

/** Save only completed (non-loading) responses to localStorage. */
export function saveTranscript(startupName: string, transcript: Transcript): void {
  if (typeof window === "undefined") return;
  const clean: Transcript = {
    rounds: transcript.rounds
      .map((r) => ({
        ...r,
        responses: Object.fromEntries(
          Object.entries(r.responses).filter(
            ([, v]) => v && !v.loading && v.text
          )
        ) as Partial<Record<AgentId, RoundResponse>>,
      }))
      .filter((r) => Object.keys(r.responses).length > 0),
  };
  localStorage.setItem(storageKey(startupName), JSON.stringify(clean));
}

export function loadTranscript(startupName: string): Transcript {
  if (typeof window === "undefined") return { rounds: [] };
  const raw = localStorage.getItem(storageKey(startupName));
  if (!raw) return { rounds: [] };
  try {
    return JSON.parse(raw) as Transcript;
  } catch {
    return { rounds: [] };
  }
}

export function clearTranscript(startupName: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(startupName));
}

/** Rebuild per-agent conversation history from a saved transcript. */
export function buildAgentHistory(
  rounds: Round[]
): Partial<Record<AgentId, ConversationTurn[]>> {
  const history: Partial<Record<AgentId, ConversationTurn[]>> = {};
  for (const round of rounds) {
    for (const [agentId, response] of Object.entries(round.responses)) {
      if (!response?.text) continue;
      const id = agentId as AgentId;
      if (!history[id]) history[id] = [];
      history[id]!.push(
        { role: "user", content: round.question },
        { role: "assistant", content: response.text }
      );
    }
  }
  return history;
}

// ── Export ────────────────────────────────────────────────────────────────────

/** Render a transcript as a Markdown string. */
export function exportTranscriptAsMarkdown(
  brain: CompanyBrain,
  rounds: Round[]
): string {
  const lines: string[] = [];

  lines.push(`# ${brain.startupName} — CoFound Council Transcript`);
  lines.push(`> ${brain.oneLiner}`);
  lines.push(
    `> Stage: **${brain.fundingStage}** · Generated: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const directedAgent = round.directedTo
      ? AGENTS.find((a) => a.id === round.directedTo)
      : null;

    lines.push(
      `## Round ${i + 1}${directedAgent ? ` · Follow-up → ${directedAgent.name}` : ""}`
    );
    lines.push(`**Question:** ${round.question}`);
    lines.push(
      `*${new Date(round.timestamp).toLocaleString("en-US", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}*`
    );
    lines.push("");

    for (const [agentId, response] of Object.entries(round.responses)) {
      if (!response?.text) continue;
      const agent = AGENTS.find((a) => a.id === agentId);
      if (!agent) continue;
      lines.push(`### ${agent.emoji} ${agent.name}`);
      lines.push(`> *${agent.tagline}*`);
      lines.push("");
      lines.push(response.text);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

/** Trigger a browser download of the transcript as a .md file. */
export function downloadTranscript(brain: CompanyBrain, rounds: Round[]): void {
  const content = exportTranscriptAsMarkdown(brain, rounds);
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${brain.startupName.toLowerCase().replace(/\s+/g, "-")}-council-${
    new Date().toISOString().slice(0, 10)
  }.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
