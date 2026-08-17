import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import {
  question,
  questionBank,
  quizAnswer,
  quizAttempt,
} from "./schema";
import { curriculumModule } from "../curriculum/schema";

export type QuizQuestion = {
  id: string;
  prompt: string;
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
    order: q.order,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  }));
}

export async function getQuizQuestionsRandom(bankId: string, count: number): Promise<QuizQuestion[]> {
  const rows = await db.query.question.findMany({
    where: eq(question.bankId, bankId),
    with: { options: { orderBy: (o, { asc }) => [asc(o.order)] } },
  });
  const shuffled = rows.sort(() => Math.random() - 0.5);
  const sliced = shuffled.slice(0, count);
  return sliced.map((q) => ({
    id: q.id,
    prompt: q.prompt,
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

export async function createAttempt(userId: string, bankId: string) {
  const attempt = await db
    .insert(quizAttempt)
    .values({ id: randomUUID(), userId, bankId })
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
    })
    .onConflictDoUpdate({
      target: [quizAnswer.attemptId, quizAnswer.questionId],
      set: {
        optionId: params.optionId,
        isCorrect,
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
    .select({ isCorrect: quizAnswer.isCorrect })
    .from(quizAnswer)
    .where(eq(quizAnswer.attemptId, attemptId));
  const score = answers.filter((a) => a.isCorrect).length;
  const questionCount = answers.length;

  await db
    .update(quizAttempt)
    .set({ score, total: questionCount, status: "completed", completedAt: new Date() })
    .where(eq(quizAttempt.id, attemptId));

  return {
    score,
    total: questionCount,
    percent: questionCount ? Math.round((score / questionCount) * 100) : 0,
  };
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
