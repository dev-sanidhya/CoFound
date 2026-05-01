import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabase, getUserId } from "@/lib/supabase";
import { CompanyBrain } from "@/lib/brain";

export const runtime = "nodejs";

function brainToRow(brain: CompanyBrain, userId: string) {
  return {
    user_id: userId,
    startup_name: brain.startupName,
    one_liner: brain.oneLiner,
    problem: brain.problem,
    solution: brain.solution,
    target_audience: brain.targetAudience,
    icp: brain.icp,
    market_size: brain.marketSize,
    funding_stage: brain.fundingStage,
    current_mrr: brain.currentMrr,
    user_count: brain.userCount,
    top_metric: brain.topMetric,
    gtm_goal: brain.gtmGoal,
    biggest_challenge: brain.biggestChallenge,
    next_milestone: brain.nextMilestone,
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBrain(row: Record<string, any>): CompanyBrain & { id: string } {
  return {
    id: row.id,
    startupName: row.startup_name,
    oneLiner: row.one_liner,
    problem: row.problem,
    solution: row.solution,
    targetAudience: row.target_audience,
    icp: row.icp,
    marketSize: row.market_size,
    fundingStage: row.funding_stage,
    currentMrr: row.current_mrr,
    userCount: row.user_count,
    topMetric: row.top_metric,
    gtmGoal: row.gtm_goal,
    biggestChallenge: row.biggest_challenge,
    nextMilestone: row.next_milestone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ company: null });

  const userId = getUserId(session.accessToken);
  const supabase = getSupabase();

  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ company: data ? rowToBrain(data) : null });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = getUserId(session.accessToken);
  const { brain } = (await req.json()) as { brain: CompanyBrain };
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("companies")
      .update(brainToRow(brain, userId))
      .eq("id", existing.id);
    return NextResponse.json({ company: { id: existing.id } });
  }

  const { data } = await supabase
    .from("companies")
    .insert(brainToRow(brain, userId))
    .select("id")
    .single();

  return NextResponse.json({ company: { id: data?.id } });
}
