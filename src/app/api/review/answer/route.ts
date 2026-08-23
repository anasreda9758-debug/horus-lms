import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { question, questionOption, questionBank, quizAnswer, quizAttempt } from "@/features/practice/schema";
import { eq } from "drizzle-orm";
import { updateQuestionReview } from "@/features/practice/queries";
import { randomUUID } from "node:crypto";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { questionId, optionId, timeSpentMs } = await request.json();
  if (!questionId || !optionId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Find question + options to grade
  const q = await db.query.question.findFirst({
    where: eq(question.id, questionId),
    with: { options: true, bank: true },
  });
  if (!q) return NextResponse.json({ error: "question not found" }, { status: 404 });

  const selected = q.options.find((o) => o.id === optionId);
  if (!selected) return NextResponse.json({ error: "option not found" }, { status: 404 });

  const isCorrect = selected.isCorrect;
  const correctOption = q.options.find((o) => o.isCorrect);

  // Lightweight approach: directly update SM-2 without creating attempt pollution
  // Use timeSpentMs to calculate quality
  await updateQuestionReview(session.user.id, questionId, isCorrect, timeSpentMs ?? 0);

  return NextResponse.json({
    correct: isCorrect,
    explanation: q.explanation ?? null,
    correctOptionId: correctOption?.id ?? null,
  });
}
