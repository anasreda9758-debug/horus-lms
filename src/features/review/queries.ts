import { and, eq, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { clinicalCase, flashcard } from "./schema";
import { isPremiumActive } from "@/features/billing/queries";

export type ReviewLecture = {
  id: string;
  title: string;
  subject: string | null;
  moduleName: string;
  moduleSlug: string;
};

// Lectures the user can generate flashcards/cases from: accessible modules
// (free always, premium when unlocked) that have readable content.
export async function listLecturesForReview(userId: string): Promise<ReviewLecture[]> {
  const premium = await isPremiumActive(userId);
  const modules = await db.query.curriculumModule.findMany({
    orderBy: (m, { asc }) => [asc(m.order)],
    with: {
      lectures: {
        orderBy: (l, { asc }) => [asc(l.order)],
      },
    },
  });

  const out: ReviewLecture[] = [];
  for (const m of modules) {
    if (!m.isFree && !premium) continue;
    for (const l of m.lectures) {
      if (!l.content || l.content.trim().length === 0) continue;
      out.push({
        id: l.id,
        title: l.title,
        subject: l.subject,
        moduleName: m.name,
        moduleSlug: m.slug,
      });
    }
  }
  return out;
}

export async function createFlashcards(
  userId: string,
  lectureId: string,
  cards: { front: string; back: string }[],
) {
  if (cards.length === 0) return 0;
  const due = new Date();
  await db.insert(flashcard).values(
    cards.map((c) => ({
      id: randomUUID(),
      userId,
      lectureId,
      front: c.front,
      back: c.back,
      intervalDays: 1,
      dueDate: due,
    })),
  );
  return cards.length;
}

export async function getDueFlashcards(userId: string, limit = 30) {
  return db.query.flashcard.findMany({
    where: and(eq(flashcard.userId, userId), lte(flashcard.dueDate, new Date())),
    orderBy: (f, { asc }) => [asc(f.dueDate)],
    limit,
    with: { lecture: true },
  });
}

export async function reviewFlashcard(cardId: string, userId: string, rating: "again" | "good" | "easy") {
  const intervals = { again: 1, good: 3, easy: 7 } as const;
  const due = new Date();
  due.setDate(due.getDate() + intervals[rating]);
  await db
    .update(flashcard)
    .set({ intervalDays: intervals[rating], dueDate: due })
    .where(and(eq(flashcard.id, cardId), eq(flashcard.userId, userId)));
}

export async function createClinicalCase(
  userId: string,
  lectureId: string,
  caseData: { case: string; questions: string[]; model_answers: string[] },
) {
  const id = randomUUID();
  await db.insert(clinicalCase).values({
    id,
    userId,
    lectureId,
    caseText: caseData.case,
    questionsJson: JSON.stringify(caseData.questions),
    modelAnswersJson: JSON.stringify(caseData.model_answers),
  });
  return id;
}

export async function getClinicalCase(id: string, userId: string) {
  return db.query.clinicalCase.findFirst({
    where: and(eq(clinicalCase.id, id), eq(clinicalCase.userId, userId)),
  });
}

export async function listMyCases(userId: string, limit = 10) {
  return db.query.clinicalCase.findMany({
    where: eq(clinicalCase.userId, userId),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
    limit,
    with: { lecture: true },
  });
}
