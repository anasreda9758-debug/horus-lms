import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { finishBattle } from "@/features/gamification/battles";
import { awardXp } from "@/features/gamification/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { battleId } = await request.json();
  if (!battleId) return NextResponse.json({ error: "battleId required" }, { status: 400 });

  const result = await finishBattle(battleId);

  // Award XP
  if (result.winnerId === session.user.id) {
    await awardXp(session.user.id, "battle_win", battleId);
  } else if (!result.winnerId) {
    // tie — small xp
  } else {
    await awardXp(session.user.id, "battle_lose", battleId);
  }

  return NextResponse.json(result);
}
