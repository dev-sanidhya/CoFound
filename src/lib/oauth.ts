/**
 * Claude OAuth 2.0 flow utilities.
 *
 * Anthropic supports OAuth for third-party apps connecting to Claude.
 * Users authorise with their own Claude/Anthropic account so API usage
 * is billed against their quota — not a shared platform key.
 *
 * OAuth endpoints:
 *   Authorise: https://claude.ai/oauth/authorize
 *   Token:     https://claude.ai/oauth/token
 */

import { v4 as uuidv4 } from "uuid";

const AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
const TOKEN_URL = "https://claude.ai/oauth/token";

export const OAUTH_SCOPES = "org:create_api_key user:profile user:inference";

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CLAUDE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.CLAUDE_OAUTH_REDIRECT_URI!,
    scope: OAUTH_SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export function generateState(): string {
  return uuidv4();
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.CLAUDE_OAUTH_REDIRECT_URI!,
      client_id: process.env.CLAUDE_OAUTH_CLIENT_ID!,
      client_secret: process.env.CLAUDE_OAUTH_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.CLAUDE_OAUTH_CLIENT_ID!,
      client_secret: process.env.CLAUDE_OAUTH_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json();
}
