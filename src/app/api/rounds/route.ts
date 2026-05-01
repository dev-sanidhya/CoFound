import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabase, getUserId } from "@/lib/supabase";
import { reconstructRound } from "@/lib/transcript";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ rounds: [] });

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ rounds: [] });

  const userId = getUserId(session.accessToken);
  const supabase = getSupabase();

  const { data } = await supabase
    .from("rounds")
    .select("*, responses(*)")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const rounds = (data ?? []).map(reconstructRound);
  return NextResponse.json({ rounds });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = getUserId(session.accessToken);
  const { roundId, companyId, question, directedTo } = (await req.json()) as {
    roundId: string;
    companyId: string;
    question: string;
    directedTo?: string;
  };
  const supabase = getSupabase();

  await supabase.from("rounds").insert({
    id: roundId,
    company_id: companyId,
    user_id: userId,
    question,
    directed_to: directedTo ?? null,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { roundId, ...updates } = (await req.json()) as {
    roundId: string;
    wave1_complete?: boolean;
    debate_triggered?: boolean;
    debate_complete?: boolean;
    synthesis_text?: string;
    synthesis_complete?: boolean;
  };
  const supabase = getSupabase();

  await supabase.from("rounds").update(updates).eq("id", roundId);
  return NextResponse.json({ ok: true });
}
