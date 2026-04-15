import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAgent, AgentId } from "@/lib/agents";
import { CompanyBrain } from "@/lib/brain";
import { getSession } from "@/lib/session";
import { ConversationTurn } from "@/lib/transcript";

export const runtime = "nodejs";

// ── In-memory rate limiter ────────────────────────────────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;          // max requests per window
const RATE_WINDOW = 60 * 1000;  // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests — slow down a bit." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

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

  const body = (await req.json()) as {
    agentId: AgentId;
    brain: CompanyBrain;
    question: string;
    history?: ConversationTurn[];
  };
  const { agentId, brain, question, history = [] } = body;

  const agent = getAgent(agentId);
  if (!agent) {
    return new Response(JSON.stringify({ error: "Unknown agent" }), {
      status: 400,
    });
  }

  // Use authToken for OAuth bearer tokens, apiKey for classic API keys
  const client = oauthToken
    ? new Anthropic({ authToken: oauthToken })
    : new Anthropic({ apiKey: devApiKey! });

  // Build message array: history (last 6 turns = 3 rounds) + current question
  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-6).map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    })),
    { role: "user", content: question },
  ];

  // Stream the response back
  const stream = await client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thinking: { type: "adaptive" } as any,
    system: agent.systemPrompt(brain),
    messages,
  });

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
