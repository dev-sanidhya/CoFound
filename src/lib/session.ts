/**
 * Lightweight cookie-based session.
 * Stores the OAuth access token server-side in a signed cookie.
 */

import { cookies } from "next/headers";

const SESSION_COOKIE = "cofound_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as Session;
  } catch {
    return null;
  }
}

export function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;
