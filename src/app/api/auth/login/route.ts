import { NextResponse } from "next/server";
import { buildAuthUrl, generateState } from "@/lib/oauth";

export async function GET() {
  const state = generateState();
  const authUrl = buildAuthUrl(state);

  const res = NextResponse.redirect(authUrl);

  // Store state in a short-lived cookie to verify on callback
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return res;
}
