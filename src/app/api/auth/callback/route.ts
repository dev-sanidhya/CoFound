import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/oauth";
import { encodeSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return NextResponse.redirect(new URL("/login?error=denied", req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.url));
  }

  // Verify state to prevent CSRF
  const storedState = req.cookies.get("oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const session = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };

    const res = NextResponse.redirect(new URL("/onboarding", req.url));

    // Set session cookie
    res.cookies.set(SESSION_COOKIE_NAME, encodeSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    // Clear state cookie
    res.cookies.delete("oauth_state");

    return res;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=token_exchange", req.url));
  }
}
