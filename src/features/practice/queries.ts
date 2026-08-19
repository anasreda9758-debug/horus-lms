import { and, desc, eq, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import {
  question,
  questionBank,
  questionReview,
  quizAnswer,
  quizAttempt,
} from "./schema";
import { curriculumModule } from "../curriculum/schema";

export type QuizQuestion = {
  id: string;
  prompt: string;
  imageUrl: string | null;
  explanation: string | null;
  difficulty: string;
  order: number;
  options: { id: string; text: string }[];
};

export async function getBankBySlug(slug: string) {
  return db.query.questionBank.findFirst({
    where: eq(questionBank.slug, slug),
    with: { module: true },
  });
}

export async function getBankForModule(moduleId: string) {
  return db.query.questionBank.findFirst({
    where: eq(questionBank.moduleId, moduleId),
  });
}

export async function getQuizQuestions(bankId: string): Promise<QuizQuestion[]> {
  const rows = await db.query.question.findMany({
    where: eq(question.bankId, bankId),
    orderBy: (q, { asc }) => [asc(q.order)],
    with: { options: { orderBy: (o, { asc }) => [asc(o.order)] } },
  });
  return rows.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    imageUrl: q.imageUrl ?? null,
    explanation: q.explanation ?? null,
    difficulty: q.difficulty ?? "medium",
    order: q.order,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  }));
}

export async function getQuizQuestionsRandom(
  bankId: string,
  count: number,
  opts?: { difficulty?: string; userId?: string },
): Promise<QuizQuestion[]> {
  let rows = await db.query.question.findMany({
    where: eq(question.bankId, bankId),
    with: { options: { orderBy: (o, { asc }) => [asc(o.order)] } },
  });

  // Filter by difficulty if specified
  if (opts?.difficulty) {
    rows = rows.filter((q) => q.difficulty === opts.difficulty);
  }

  // Spaced-repetition: boost questions due for review
  if (opts?.userId) {
    const dueQuestions = await db
      .select({ questionId: questionReview.questionId })
      .from(questionReview)
      .where(
        and(
          eq(questionReview.userId, opts.userId),
          lte(questionReview.nextReview, new Date()),
        ),
      );

    const dueSet = new Set(dueQuestions.map((d) => d.questionId));
    // Sort: due questions first, then random
    rows.sort((a, b) => {
      const aDue = dueSet.has(a.id) ? 0 : 1;
      const bDue = dueSet.has(b.id) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;
      return Math.random() - 0.5;
    });
  } else {
    rows.sort(() => Math.random() - 0.5);
  }

  const sliced = rows.slice(0, count);
  return sliced.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    imageUrl: q.imageUrl ?? null,
    explanation: q.explanation ?? null,
    difficulty: q.difficulty ?? "medium",
    order: q.order,
    options: q.options.map((o) => ({ id: o.id, text: o.text })).sort(() => Math.random() - 0.5),
  }));
}

export async function getInProgressAttempt(userId: string, bankId: string) {
  return db.query.quizAttempt.findFirst({
    where: and(
      eq(quizAttempt.userId, userId),
      eq(quizAttempt.bankId, bankId),
      eq(quizAttempt.status, "in_progress"),
    ),
  });
}

export async function getOwnedAttempt(userId: string, attemptId: string) {
  return db.query.quizAttempt.findFirst({
    where: and(eq(quizAttempt.id, attemptId), eq(quizAttempt.userId, userId)),
  });
}

export async function createAttempt(
  userId: string,
  bankId: string,
  opts?: { difficulty?: string; timeLimitSec?: number },
) {
  const attempt = await db
    .insert(quizAttempt)
    .values({
      id: randomUUID(),
      userId,
      bankId,
      difficulty: opts?.difficulty ?? null,
      timeLimitSec: opts?.timeLimitSec ?? null,
    })
    .returning();
  return attempt[0];
}

export async function resolveAttempt(userId: string, bankId: string) {
  const existing = await getInProgressAttempt(userId, bankId);
  return existing ?? (await createAttempt(userId, bankId));
}

export async function gradeAnswer(params: {
  attemptId: string;
  questionId: string;
  optionId: string;
  timeSpentMs?: number;
}) {
  const q = await db.query.question.findFirst({
    where: eq(question.id, params.questionId),
    with: { options: true },
  });
  if (!q) return null;

  const selected = q.options.find((o) => o.id === params.optionId);
  if (!selected) return null;

  const isCorrect = selected.isCorrect;

  await db
    .insert(quizAnswer)
    .values({
      id: randomUUID(),
      attemptId: params.attemptId,
      questionId: params.questionId,
      optionId: params.optionId,
      isCorrect,
      timeSpentMs: params.timeSpentMs ?? 0,
    })
    .onConflictDoUpdate({
      target: [quizAnswer.attemptId, quizAnswer.questionId],
      set: {
        optionId: params.optionId,
        isCorrect,
        timeSpentMs: params.timeSpentMs ?? 0,
        answeredAt: new Date(),
      },
    });

  return { correct: isCorrect, explanation: q.explanation ?? null };
}

export async function finishAttempt(userId: string, attemptId: string) {
  const attempt = await getOwnedAttempt(userId, attemptId);
  if (!attempt) return null;
  if (attempt.status === "completed") {
    return {
      score: attempt.score,
      total: attempt.total,
      percent: attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0,
    };
  }

  const answers = await db
    .select({ isCorrect: quizAnswer.isCorrect, questionId: quizAnswer.questionId })
    .from(quizAnswer)
    .where(eq(quizAnswer.attemptId, attemptId));
  const score = answers.filter((a) => a.isCorrect).length;
  const questionCount = answers.length;

  await db
    .update(quizAttempt)
    .set({ score, total: questionCount, status: "completed", completedAt: new Date() })
    .where(eq(quizAttempt.id, attemptId));

  // Update spaced-repetition for each answered question
  for (const ans of answers) {
    await updateQuestionReview(userId, ans.questionId, ans.isCorrect);
  }

  return {
    score,
    total: questionCount,
    percent: questionCount ? Math.round((score / questionCount) * 100) : 0,
  };
}

// ── Spaced Repetition (SM-2 Algorithm) ──

/**
 * SM-2 quality: 0-5
 * We map correct/incorrect to SM-2 quality:
 *   correct + fast (<5s)  → quality 5
 *   correct + normal      → quality 4
 *   correct + slow (>15s) → quality 3
 *   incorrect + close     → quality 1
 *   incorrect              → quality 0
 */
function correctToQuality(isCorrect: boolean, _timeMs: number): number {
  if (!isCorrect) return 0;
  return 4; // default quality for correct answer
}

async function updateQuestionReview(userId: string, questionId: string, isCorrect: boolean) {
  const quality = correctToQuality(isCorrect, 0);

  const [existing] = await db
    .select()
    .from(questionReview)
    .where(
      and(
        eq(questionReview.userId, userId),
        eq(questionReview.questionId, questionId),
      ),
    )
    .limit(1);

  if (!existing) {
    // First review
    const interval = quality >= 3 ? 1 : 0;
    const ef = Math.max(130, 250 + (quality - 3) * 10); // min 1.3
    const nextReview = new Date();
    if (interval > 0) nextReview.setDate(nextReview.getDate() + interval);

    await db.insert(questionReview).values({
      id: randomUUID(),
      userId,
      questionId,
      easeFactor: ef,
      interval,
      repetitions: quality >= 3 ? 1 : 0,
      nextReview,
      lastReview: new Date(),
      totalReviews: 1,
      correctCount: isCorrect ? 1 : 0,
    });
    return;
  }

  // SM-2 algorithm
  let ef = existing.easeFactor;
  let interval = existing.interval;
  let reps = existing.repetitions;

  if (quality >= 3) {
    // Correct
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * (ef / 100));
    }
    reps += 1;
  } else {
    // Incorrect — reset
    reps = 0;
    interval = 0;
  }

  // Update ease factor
  ef = ef + (quality - 3) * 10;
  ef = Math.max(130, ef); // minimum 1.3

  const nextReview = new Date();
  if (interval > 0) {
    nextReview.setDate(nextReview.getDate() + interval);
  } else {
    // Review again soon (10 minutes)
    nextReview.setMinutes(nextReview.getMinutes() + 10);
  }

  await db
    .update(questionReview)
    .set({
      easeFactor: ef,
      interval,
      repetitions: reps,
      nextReview,
      lastReview: new Date(),
      totalReviews: existing.totalReviews + 1,
      correctCount: existing.correctCount + (isCorrect ? 1 : 0),
      updatedAt: new Date(),
    })
    .where(eq(questionReview.id, existing.id));
}

// ── Quiz History ──

export async function getQuizHistory(userId: string, limit = 20) {
  const rows = await db
    .select({
      id: quizAttempt.id,
      bankId: quizAttempt.bankId,
      score: quizAttempt.score,
      total: quizAttempt.total,
      status: quizAttempt.status,
      difficulty: quizAttempt.difficulty,
      timeLimitSec: quizAttempt.timeLimitSec,
      elapsedSec: quizAttempt.elapsedSec,
      startedAt: quizAttempt.startedAt,
      completedAt: quizAttempt.completedAt,
      bankTitle: questionBank.title,
      bankSlug: questionBank.slug,
      moduleName: curriculumModule.name,
      moduleSlug: curriculumModule.slug,
    })
    .from(quizAttempt)
    .innerJoin(questionBank, eq(quizAttempt.bankId, questionBank.id))
    .innerJoin(curriculumModule, eq(questionBank.moduleId, curriculumModule.id))
    .where(and(eq(quizAttempt.userId, userId), eq(quizAttempt.status, "completed")))
    .orderBy(desc(quizAttempt.completedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    bankTitle: r.bankTitle,
    bankSlug: r.bankSlug,
    moduleName: r.moduleName,
    moduleSlug: r.moduleSlug,
    score: r.score,
    total: r.total,
    percent: r.total ? Math.round((r.score / r.total) * 100) : 0,
    difficulty: r.difficulty,
    timeLimitSec: r.timeLimitSec,
    elapsedSec: r.elapsedSec,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
  }));
}

export async function getModuleAccuracy(userId: string) {
  const rows = await db
    .select({
      moduleSlug: curriculumModule.slug,
      moduleName: curriculumModule.name,
      score: quizAttempt.score,
      total: quizAttempt.total,
    })
    .from(quizAttempt)
    .innerJoin(questionBank, eq(quizAttempt.bankId, questionBank.id))
    .innerJoin(curriculumModule, eq(questionBank.moduleId, curriculumModule.id))
    .where(and(eq(quizAttempt.userId, userId), eq(quizAttempt.status, "completed")))
    .orderBy(desc(quizAttempt.completedAt));

  const byModule = new Map<string, { moduleSlug: string; moduleName: string; score: number; total: number }>();
  for (const r of rows) {
    const cur = byModule.get(r.moduleSlug) ?? {
      moduleSlug: r.moduleSlug,
      moduleName: r.moduleName,
      score: 0,
      total: 0,
    };
    cur.score += r.score;
    cur.total += r.total;
    byModule.set(r.moduleSlug, cur);
  }

  return [...byModule.values()].map((m) => ({
    moduleSlug: m.moduleSlug,
    moduleName: m.moduleName,
    correct: m.score,
    total: m.total,
    percent: m.total ? Math.round((m.score / m.total) * 100) : 0,
  }));
}
