import { getSupabase } from "./supabase";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

// In-memory fallback if the rate_limits table hasn't been migrated yet
const fallbackMap = new Map<string, { count: number; resetAt: number }>();

function fallbackCheck(identifier: string): boolean {
  const now = Date.now();
  const entry = fallbackMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    fallbackMap.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) return true;
  entry.count++;
  return false;
}

export async function isRateLimited(identifier: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

    const { count, error: countError } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier)
      .gte("created_at", windowStart);

    if (countError) return fallbackCheck(identifier);
    if ((count ?? 0) >= MAX_REQUESTS) return true;

    await supabase.from("rate_limits").insert({ identifier });
    return false;
  } catch {
    return fallbackCheck(identifier);
  }
}
