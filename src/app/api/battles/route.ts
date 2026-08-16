import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { createBattle, joinBattle, getBattle, getUserBattles } from "@/features/gamification/battles";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const battleId = request.nextUrl.searchParams.get("id");
  if (battleId) {
    const b = await getBattle(battleId);
    if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(b);
  }

  const battles = await getUserBattles(session.user.id);
  return NextResponse.json({ battles });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();

  if (body.action === "create") {
    const bankSlug = body.bankSlug as string;
    const questionCount = Math.min(Math.max(Number(body.questionCount) || 5, 3), 10);
    if (!bankSlug) return NextResponse.json({ error: "bankSlug required" }, { status: 400 });
    const battleId = await createBattle(session.user.id, bankSlug, questionCount);
    return NextResponse.json({ battleId });
  }

  if (body.action === "join") {
    const battleId = body.battleId as string;
    if (!battleId) return NextResponse.json({ error: "battleId required" }, { status: 400 });
    const result = await joinBattle(battleId, session.user.id);
    if (!result) return NextResponse.json({ error: "battle unavailable" }, { status: 400 });
    return NextResponse.json({ battleId: result });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
