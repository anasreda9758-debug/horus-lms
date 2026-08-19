import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { setReady } from "@/features/gamification/battles";
import { battleReadySchema } from "@/shared/validation";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let battleId: string;
  try {
    const body = await request.json();
    const parsed = battleReadySchema.parse(body);
    battleId = parsed.battleId;
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "validation", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const started = await setReady(battleId, session.user.id);
  return NextResponse.json({ started });
}
