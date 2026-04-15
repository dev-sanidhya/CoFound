import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAgent, AgentId } from "@/lib/agents";
import { CompanyBrain } from "@/lib/brain";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();

  // Resolve credentials:
  // - OAuth token from `claude setup-token`  → authToken (Authorization: Bearer)
  // - Fallback ANTHROPIC_API_KEY for local dev → apiKey (x-api-key)
  const oauthToken = session?.accessToken ?? null;
  const devApiKey = process.env.ANTHROPIC_API_KEY ?? null;
  if (!oauthToken && !devApiKey) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
    });
  }

  const body = await req.json() as { agentId: AgentId; brain: CompanyBrain; question: string };
  const { agentId, brain, question } = body;

  const agent = getAgent(agentId);
  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent" }), { status: 400 });
  }

  // Use authToken for OAuth bearer tokens, apiKey for classic API keys
  const client = oauthToken
    ? new Anthropic({ authToken: oauthToken })
    : new Anthropic({ apiKey: devApiKey! });

  // Stream the response back
  const stream = await client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: "adaptive" } as any,
    system: agent.systemPrompt(brain),
    messages: [{ role: "user", content: question }],
  });

  // Return as SSE stream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
