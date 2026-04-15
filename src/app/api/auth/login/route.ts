import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { encodeSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token: string };

  if (!token?.trim()) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Validate the token by making a lightweight API call
  try {
    const client = new Anthropic({ authToken: token.trim(), maxRetries: 0 });
    // Minimal call — just enough to confirm the token is valid
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: "Invalid token — make sure you copied the full output of `claude setup-token`." },
        { status: 401 }
      );
    }
    // Any other error (rate limit, network, etc.) — still accept the token
    // so we don't block users on transient failures
  }

  // Store token in a session cookie
  const session = encodeSession({
    accessToken: token.trim(),
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return res;
}
