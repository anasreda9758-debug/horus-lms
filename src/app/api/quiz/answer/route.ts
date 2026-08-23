import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { getBankBySlug, gradeAnswer, resolveAttempt, getOwnedAttempt } from "@/features/practice/queries";
import { awardXp } from "@/features/gamification/queries";
import { quizAnswerSchema } from "@/shared/validation";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let bankSlug: string;
  let questionId: string;
  let optionId: string;
  let timeSpentMs: number | undefined;
  let attemptId: string | undefined;
  try {
    const body = await request.json();
    const parsed = quizAnswerSchema.parse(body);
    bankSlug = parsed.bankSlug;
    questionId = parsed.questionId;
    optionId = parsed.optionId;
    timeSpentMs = parsed.timeSpentMs;
    attemptId = parsed.attemptId;
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "validation", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const bank = await getBankBySlug(bankSlug);
  if (!bank) {
    return NextResponse.json({ error: "bank not found" }, { status: 400 });
  }

  let attempt = attemptId ? await getOwnedAttempt(session.user.id, attemptId) : null;
  if (attempt && attempt.status !== "in_progress") attempt = null;
  if (!attempt || attempt.bankId !== bank.id) {
    attempt = await resolveAttempt(session.user.id, bank.id);
  }

  const result = await gradeAnswer({
    attemptId: attempt.id,
    questionId,
    optionId,
    timeSpentMs,
  });
  if (!result) {
    return NextResponse.json({ error: "question or option not found" }, { status: 400 });
  }

  // Award XP for correct answer
  if (result.correct) {
    awardXp(session.user.id, "quiz_correct", questionId).catch(() => {});
  }

  return NextResponse.json({ attemptId: attempt.id, ...result });
}
