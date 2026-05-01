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
  directedTo?: AgentId;

  // Wave 1 — independent parallel responses
  responses: Partial<Record<AgentId, RoundResponse>>;
  wave1Complete: boolean;

  // Wave 2 — debate (each agent reacts to all Wave 1 outputs)
  debateTriggered: boolean;
  debateResponses: Partial<Record<AgentId, RoundResponse>>;
  debateComplete: boolean;

  // Synthesis — unified council recommendation
  synthesis?: string;
  synthesisLoading?: boolean;
  synthesisComplete?: boolean;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

// ── Reconstruction from DB rows ───────────────────────────────────────────────

export interface DBRound {
  id: string;
  question: string;
  directed_to: string | null;
  wave1_complete: boolean;
  debate_triggered: boolean;
  debate_complete: boolean;
  synthesis_text: string | null;
  synthesis_complete: boolean;
  created_at: string;
  responses: {
    agent_id: string;
    wave: number;
    content: string;
    is_complete: boolean;
  }[];
}

export function reconstructRound(r: DBRound): Round {
  const wave1: Partial<Record<AgentId, RoundResponse>> = {};
  const debate: Partial<Record<AgentId, RoundResponse>> = {};

  for (const resp of r.responses ?? []) {
    const entry: RoundResponse = {
      text: resp.content,
      loading: !resp.is_complete,
    };
    if (resp.wave === 1) wave1[resp.agent_id as AgentId] = entry;
    else if (resp.wave === 2) debate[resp.agent_id as AgentId] = entry;
  }

  return {
    id: r.id,
    question: r.question,
    timestamp: new Date(r.created_at).getTime(),
    directedTo: (r.directed_to as AgentId) ?? undefined,
    responses: wave1,
    wave1Complete: r.wave1_complete,
    debateTriggered: r.debate_triggered,
    debateResponses: debate,
    debateComplete: r.debate_complete,
    synthesis: r.synthesis_text ?? undefined,
    synthesisComplete: r.synthesis_complete,
  };
}

// ── Agent history ─────────────────────────────────────────────────────────────

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

    if (Object.keys(round.responses).length > 0) {
      lines.push("### Wave 1 — Independent Analysis");
      lines.push("");
      for (const [agentId, response] of Object.entries(round.responses)) {
        if (!response?.text) continue;
        const agent = AGENTS.find((a) => a.id === agentId);
        if (!agent) continue;
        lines.push(`#### ${agent.emoji} ${agent.name}`);
        lines.push(`> *${agent.tagline}*`);
        lines.push("");
        lines.push(response.text);
        lines.push("");
      }
    }

    if (round.debateTriggered && Object.keys(round.debateResponses).length > 0) {
      lines.push("### Wave 2 — The Debate");
      lines.push("");
      for (const [agentId, response] of Object.entries(round.debateResponses)) {
        if (!response?.text) continue;
        const agent = AGENTS.find((a) => a.id === agentId);
        if (!agent) continue;
        lines.push(`#### ${agent.emoji} ${agent.name} (debate)`);
        lines.push("");
        lines.push(response.text);
        lines.push("");
      }
    }

    if (round.synthesis) {
      lines.push("### Council Synthesis");
      lines.push("");
      lines.push(round.synthesis);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

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
