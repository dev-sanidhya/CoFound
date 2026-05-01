import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AgentId } from "@/lib/agents";
import { CompanyBrain } from "@/lib/brain";
import { getSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";
import { buildSynthesisPrompt } from "@/lib/synthesis";

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
    roundId: string;
    brain: CompanyBrain;
    question: string;
    allWave1Responses: Partial<Record<AgentId, string>>;
    allDebateResponses: Partial<Record<AgentId, string>>;
  };
  const { roundId, brain, question, allWave1Responses, allDebateResponses } = body;

  const client = oauthToken
    ? new Anthropic({ authToken: oauthToken })
    : new Anthropic({ apiKey: devApiKey! });

  const prompt = buildSynthesisPrompt(brain, question, allWave1Responses, allDebateResponses);

  const stream = await client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
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
          await supabase
            .from("rounds")
            .update({
              synthesis_text: fullText,
              synthesis_complete: true,
            })
            .eq("id", roundId);
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
