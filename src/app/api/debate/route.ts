import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAgent, AgentId, AGENTS } from "@/lib/agents";
import { CompanyBrain } from "@/lib/brain";
import { getSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";
import { ConversationTurn } from "@/lib/transcript";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const oauthToken = session?.accessToken ?? null;
  const devApiKey = process.env.ANTHROPIC_API_KEY ?? null;
  if (!oauthToken && !devApiKey) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  const body = (await req.json()) as {
    agentId: AgentId;
    brain: CompanyBrain;
    question: string;
    history?: ConversationTurn[];
    roundId: string;
    allWave1Responses: Partial<Record<AgentId, string>>;
  };
  const { agentId, brain, question, history = [], roundId, allWave1Responses } = body;

  const agent = getAgent(agentId);
  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent" }), {
      status: 400,
    });
  }

  const client = oauthToken
    ? new Anthropic({ authToken: oauthToken })
    : new Anthropic({ apiKey: devApiKey! });

  const otherAgentSummaries = AGENTS.filter(
    (a) => a.id !== agentId && allWave1Responses[a.id]
  )
    .map((a) => `**${a.emoji} ${a.name}:**\n${allWave1Responses[a.id]}`)
    .join("\n\n---\n\n");

  const myWave1 = allWave1Responses[agentId];
  const debateInstruction = `The council independently analyzed this question: "${question}"

${myWave1 ? `Your own Wave 1 response was:\n${myWave1}\n\n` : ""}The other advisors said:\n\n${otherAgentSummaries}

Now enter the debate. You must:
1. Identify where you agree with other advisors — and why that alignment matters
2. Challenge at least one position you disagree with, with specific reasoning rooted in your role
3. Surface something important that the council collectively missed or underweighted
4. Give ${brain.startupName} a clear takeaway from your perspective in this debate

This is not a summary. It is a reaction. Be direct, be specific, be willing to be unpopular.`;

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-4).map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    })),
    { role: "user", content: debateInstruction },
  ];

  const stream = await client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: "adaptive" } as any,
    system: agent.systemPrompt(brain),
    messages,
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));

        if (fullText) {
          const supabase = getSupabase();
          await supabase.from("responses").upsert(
            {
              round_id: roundId,
              agent_id: agentId,
              wave: 2,
              content: fullText,
              is_complete: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "round_id,agent_id,wave" }
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
