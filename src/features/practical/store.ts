import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { getAccessibleModuleBySlug } from "@/features/access/learning-access";
import { practicalImage, practicalQuestion, practicalProgress, practicalSubmission } from "./schema";
import { createPracticalService, PracticalError, type PracticalStore } from "./service";
import { readPracticalImage } from "./images";
import type { Scope } from "./model";

export const practicalStore: PracticalStore = {
  async catalog(scope: Scope) {
    const rows = await db.select({ question: practicalQuestion, image: practicalImage }).from(practicalQuestion)
      .innerJoin(practicalImage, eq(practicalQuestion.imageId, practicalImage.id))
      .where(and(eq(practicalQuestion.moduleId, scope.moduleId), eq(practicalQuestion.subject, scope.subject),
        eq(practicalQuestion.studyYear, scope.studyYear), eq(practicalQuestion.isFixture, scope.fixtures),
        scope.fixtures ? undefined : eq(practicalQuestion.status, "APPROVED")))
      .orderBy(asc(practicalQuestion.order));
    const images = [...new Map(rows.map((r) => [r.image.id, r.image])).values()];
    const available = (await Promise.all(images.map(async (i) => {
      try { await readPracticalImage(i); return i; } catch { return null; }
    }))).filter((i) => i !== null);
    return { questions: rows.map((r) => r.question), images: available };
  },
  async progress(userId, questionIds) {
    if (!questionIds.length) return [];
    const rows = await db.select().from(practicalProgress).where(and(eq(practicalProgress.userId, userId), inArray(practicalProgress.questionId, questionIds)));
    return rows.map(({ questionId, attempts, correct, wrong, wrongRemaining, bookmarked, difficult }) => ({ questionId, attempts, correct, wrong, wrongRemaining, bookmarked, difficult }));
  },
  async saveAnswer(userId, questionId, optionId, correct, requestId) {
    await db.transaction(async (tx) => {
      const inserted = await tx.insert(practicalSubmission).values({ id: randomUUID(), userId, questionId, optionId, correct, requestId })
        .onConflictDoNothing({ target: [practicalSubmission.userId, practicalSubmission.requestId] }).returning({ id: practicalSubmission.id });
      if (!inserted.length) {
        const [previous] = await tx.select().from(practicalSubmission).where(and(eq(practicalSubmission.userId, userId), eq(practicalSubmission.requestId, requestId)));
        if (!previous || previous.questionId !== questionId || previous.optionId !== optionId) throw new PracticalError("Submission ID was already used", 409);
        return;
      }
      await tx.insert(practicalProgress).values({ userId, questionId, attempts: 1, correct: correct ? 1 : 0, wrong: correct ? 0 : 1, wrongRemaining: !correct })
        .onConflictDoUpdate({ target: [practicalProgress.userId, practicalProgress.questionId], set: {
          attempts: sql`${practicalProgress.attempts} + 1`, correct: sql`${practicalProgress.correct} + ${correct ? 1 : 0}`,
          wrong: sql`${practicalProgress.wrong} + ${correct ? 0 : 1}`, wrongRemaining: !correct, updatedAt: new Date(),
        } });
    });
  },
  async setFlag(userId, questionId, flag, value) {
    await db.insert(practicalProgress).values({ userId, questionId, [flag]: value })
      .onConflictDoUpdate({ target: [practicalProgress.userId, practicalProgress.questionId], set: { [flag]: value, updatedAt: new Date() } });
  },
};
export const practicalService = createPracticalService(practicalStore, async (actor, slug) => {
  const access = await getAccessibleModuleBySlug(actor, slug);
  return access.ok ? access.value : null;
}, process.env.NODE_ENV === "development");
