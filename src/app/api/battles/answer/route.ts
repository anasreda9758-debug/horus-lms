import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { answerBattleQuestion } from "@/features/gamification/battles";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { battleId, questionId, optionId } = await request.json();
  if (!battleId || !questionId || !optionId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Check if correct
  const [opt] = await db.execute(sql`
    SELECT is_correct FROM question_option WHERE id = ${optionId} AND question_id = ${questionId}
  `);
  const isCorrect = (opt as any)?.is_correct === true || (opt as any)?.is_correct === 1;

  await answerBattleQuestion(battleId, session.user.id, questionId, optionId, isCorrect);

  return NextResponse.json({ correct: isCorrect });
}
