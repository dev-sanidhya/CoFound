import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAgent, AgentId } from "@/lib/agents";
import { CompanyBrain } from "@/lib/brain";
import { getSession } from "@/lib/session";
import { getSupabase, getUserId } from "@/lib/supabase";
import { isRateLimited } from "@/lib/rateLimit";
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

  const identifier = oauthToken
    ? getUserId(oauthToken)
    : (req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "dev");

  if (await isRateLimited(identifier)) {
    return new Response(
      JSON.stringify({ error: "Too many requests — slow down a bit." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = (await req.json()) as {
    agentId: AgentId;
    brain: CompanyBrain;
    question: string;
    history?: ConversationTurn[];
    roundId?: string;
  };
  const { agentId, brain, question, history = [], roundId } = body;

  const agent = getAgent(agentId);
  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent" }), {
      status: 400,
    });
  }

  const client = oauthToken
    ? new Anthropic({ authToken: oauthToken })
    : new Anthropic({ apiKey: devApiKey! });

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-6).map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    })),
    { role: "user", content: question },
  ];

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
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

        if (roundId && fullText && (oauthToken || devApiKey)) {
          const userId = getUserId(oauthToken ?? devApiKey!);
          const supabase = getSupabase();
          await supabase.from("responses").upsert(
            {
              round_id: roundId,
              agent_id: agentId,
              wave: 1,
              content: fullText,
              is_complete: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "round_id,agent_id,wave" }
          );
          void userId;
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
