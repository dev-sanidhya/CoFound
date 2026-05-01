import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSupabase, getUserId } from "@/lib/supabase";
import { CompanyBrain } from "@/lib/brain";
import { Council } from "@/components/council/Council";

async function fetchCompany(
  token: string
): Promise<(CompanyBrain & { id: string }) | null> {
  const userId = getUserId(token);
  const supabase = getSupabase();

  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    startupName: data.startup_name,
    oneLiner: data.one_liner,
    problem: data.problem,
    solution: data.solution,
    targetAudience: data.target_audience,
    icp: data.icp,
    marketSize: data.market_size,
    fundingStage: data.funding_stage,
    currentMrr: data.current_mrr,
    userCount: data.user_count,
    topMetric: data.top_metric,
    gtmGoal: data.gtm_goal,
    biggestChallenge: data.biggest_challenge,
    nextMilestone: data.next_milestone,
    contextNotes: data.context_notes ?? "",
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const company = await fetchCompany(session.accessToken);
  if (!company) redirect("/onboarding");

  return <Council brain={company} companyId={company.id} />;
}
