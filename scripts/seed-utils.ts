import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/shared/db";
import { question, questionBank, questionOption } from "../src/features/practice/schema";

export type SeedQuestion = {
  prompt: string;
  imageUrl?: string;
  explanation: string;
  options: [string, string, string, string, string]; // 5 choices (A-E)
  answer: 0 | 1 | 2 | 3 | 4; // index of correct option
  difficulty?: "easy" | "medium" | "hard";
};

export async function seedBank(opts: {
  moduleSlug: string;
  bankSlug: string;
  bankTitle: string;
  questions: SeedQuestion[];
  overwrite?: boolean;
}): Promise<boolean> {
  const mod = await db.query.curriculumModule.findFirst({
    where: (m, { eq }) => eq(m.slug, opts.moduleSlug),
  });
  if (!mod) {
    console.error(`[seed] module '${opts.moduleSlug}' not found`);
    return false;
  }

  const existing = await db.query.questionBank.findFirst({
    where: (b, { eq }) => eq(b.slug, opts.bankSlug),
  });
  if (existing && !opts.overwrite) {
    console.log(`[seed] bank '${opts.bankSlug}' already present — skipping`);
    return true;
  }

  if (existing && opts.overwrite) {
    const exQs = await db.query.question.findMany({
      where: (q, { eq }) => eq(q.bankId, existing.id),
    });
    for (const q of exQs) {
      await db.delete(questionOption).where((o, { eq }) => eq(o.questionId, q.id));
    }
    await db.delete(question).where((q, { eq }) => eq(q.bankId, existing.id));
    await db.delete(questionBank).where((b, { eq }) => eq(b.id, existing.id));
  }

  const bankId = randomUUID();
  await db.insert(questionBank).values({
    id: bankId,
    moduleId: mod.id,
    slug: opts.bankSlug,
    title: opts.bankTitle,
  });

  for (const [qi, q] of opts.questions.entries()) {
    const questionId = randomUUID();
    await db.insert(question).values({
      id: questionId,
      bankId,
      prompt: q.prompt,
      imageUrl: q.imageUrl ?? null,
      explanation: q.explanation,
      difficulty: q.difficulty ?? "medium",
      order: qi + 1,
    });
    for (const [oi, text] of q.options.entries()) {
      await db.insert(questionOption).values({
        id: randomUUID(),
        questionId,
        text,
        isCorrect: oi === q.answer,
        order: oi + 1,
      });
    }
  }

  console.log(`[seed] ✓ bank '${opts.bankSlug}' — ${opts.questions.length} questions`);
  return true;
}
