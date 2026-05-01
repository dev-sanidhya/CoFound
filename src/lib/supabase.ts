import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function getSupabase() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export function getUserId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
