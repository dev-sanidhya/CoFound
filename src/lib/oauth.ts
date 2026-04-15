/**
 * Token utilities for the `claude setup-token` auth approach.
 *
 * Users run `claude setup-token` in their terminal (requires Claude Code CLI + Max plan),
 * copy the resulting OAuth bearer token, and paste it into CoFound.
 * No OAuth app registration needed — tokens are 1-year bearer tokens issued by Anthropic.
 *
 * The token is passed via the Anthropic SDK's `authToken` option which maps to the
 * `Authorization: Bearer <token>` header — distinct from `apiKey` (x-api-key header).
 *
 * Reference: Divya Ranjan's thread on using CLAUDE_CODE_OAUTH_TOKEN with the SDK.
 */

/**
 * Basic sanity check before making a live API call.
 * We accept any non-empty string and let the Anthropic API be the authoritative validator.
 */
export function looksLikeToken(value: string): boolean {
  return value.trim().length > 20;
}
