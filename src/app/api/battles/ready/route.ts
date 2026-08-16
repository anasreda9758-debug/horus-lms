import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { setReady } from "@/features/gamification/battles";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { battleId } = await request.json();
  if (!battleId) return NextResponse.json({ error: "battleId required" }, { status: 400 });

  const started = await setReady(battleId, session.user.id);
  return NextResponse.json({ started });
}
