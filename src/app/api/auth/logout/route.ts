import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function GET() {
  const res = NextResponse.redirect(
    new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  );
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
