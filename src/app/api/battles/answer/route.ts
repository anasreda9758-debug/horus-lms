import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { answerBattleQuestion } from "@/features/gamification/battles";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";
import { battleAnswerSchema } from "@/shared/validation";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let battleId: string;
  let questionId: string;
  let optionId: string;
  try {
    const body = await request.json();
    const parsed = battleAnswerSchema.parse(body);
    battleId = parsed.battleId;
    questionId = parsed.questionId;
    optionId = parsed.optionId;
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "validation", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const [opt] = await db.execute(sql`
    SELECT is_correct FROM question_option WHERE id = ${optionId} AND question_id = ${questionId}
  `);
  const isCorrect = (opt as any)?.is_correct === true || (opt as any)?.is_correct === 1;

  await answerBattleQuestion(battleId, session.user.id, questionId, optionId, isCorrect);

  return NextResponse.json({ correct: isCorrect });
}
