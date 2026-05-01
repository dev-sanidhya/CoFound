import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabase, getUserId } from "@/lib/supabase";

export const runtime = "nodejs";

export interface Artifact {
  id: string;
  companyId: string;
  roundId?: string;
  type: "action" | "risk" | "experiment";
  content: string;
  agentId?: string;
  completed: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToArtifact(row: Record<string, any>): Artifact {
  return {
    id: row.id,
    companyId: row.company_id,
    roundId: row.round_id ?? undefined,
    type: row.type,
    content: row.content,
    agentId: row.agent_id ?? undefined,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ artifacts: [] });

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ artifacts: [] });

  const supabase = getSupabase();
  const { data } = await supabase
    .from("artifacts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ artifacts: (data ?? []).map(rowToArtifact) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as {
    companyId: string;
    roundId?: string;
    items: { type: "action" | "risk" | "experiment"; content: string; agentId?: string }[];
  };

  const supabase = getSupabase();
  const rows = body.items.map((item) => ({
    company_id: body.companyId,
    round_id: body.roundId ?? null,
    type: item.type,
    content: item.content,
    agent_id: item.agentId ?? null,
  }));

  const { data } = await supabase.from("artifacts").insert(rows).select("*");
  return NextResponse.json({ artifacts: (data ?? []).map(rowToArtifact) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userId = getUserId(session.accessToken);
  const { id, completed } = (await req.json()) as { id: string; completed: boolean };
  const supabase = getSupabase();

  await supabase.from("artifacts").update({ completed }).eq("id", id);
  void userId;

  return NextResponse.json({ ok: true });
}
