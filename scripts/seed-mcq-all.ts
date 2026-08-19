import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/shared/db";
import { question, questionBank, questionOption } from "../src/features/practice/schema";

export type SeedQuestion = {
  prompt: string;
  explanation: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
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
    console.error(`[seed-mcq] module '${opts.moduleSlug}' not found`);
    return false;
  }

  const existing = await db.query.questionBank.findFirst({
    where: (b, { eq }) => eq(b.slug, opts.bankSlug),
  });
  if (existing && !opts.overwrite) {
    console.log(`[seed-mcq] bank '${opts.bankSlug}' already present — skipping`);
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

  console.log(`[seed-mcq] ✓ bank '${opts.bankSlug}' — ${opts.questions.length} questions`);
  return true;
}

import { questions as ahe101 } from "./mcq/ahe-101";
import { questions as ppg102 } from "./mcq/ppg-102";
import { questions as pmb103 } from "./mcq/pmb-103";
import { questions as mt104 } from "./mcq/mt-104";
import { questions as en105 } from "./mcq/en-105";
import { questions as rs201 } from "./mcq/rs-201";
import { questions as cvs202 } from "./mcq/cvs-202";
import { questions as rau203 } from "./mcq/rau-203";
import { questions as ibl204 } from "./mcq/ibl-204";
import { questions as uni205 } from "./mcq/uni-205";

const banks = [
  { moduleSlug: "ahe-101", bankSlug: "ahe-mcq-bank", bankTitle: "التشريح والأجنة والأنسجة — بنك أسئلة شامل", questions: ahe101 },
  { moduleSlug: "ppg-102", bankSlug: "ppg-mcq-bank", bankTitle: "الطفروالفيزيولوجيا — بنك أسئلة شامل", questions: ppg102 },
  { moduleSlug: "pmb-103", bankSlug: "pmb-mcq-bank", bankTitle: "الباثولوجي والبكتيرiology والكيمياء الحيوية — بنك أسئلة شامل", questions: pmb103 },
  { moduleSlug: "mt-104", bankSlug: "mt-mcq-bank", bankTitle: "المصطلحات الطبية — بنك أسئلة شامل", questions: mt104 },
  { moduleSlug: "en-105", bankSlug: "en-mcq-bank", bankTitle: "اللغة الإنجليزية — بنك أسئلة شامل", questions: en105 },
  { moduleSlug: "rs-201", bankSlug: "rs-mcq-bank", bankTitle: "الجهاز التنفسي — بنك أسئلة شامل", questions: rs201 },
  { moduleSlug: "cvs-202", bankSlug: "cvs-mcq-bank", bankTitle: "الجهاز القلبي الوعائي — بنك أسئلة شامل", questions: cvs202 },
  { moduleSlug: "rau-203", bankSlug: "rau-mcq-bank", bankTitle: "الجهاز البولي والكلى — بنك أسئلة شامل", questions: rau203 },
  { moduleSlug: "ibl-204", bankSlug: "ibl-mcq-bank", bankTitle: "المناعة والدم والלימفا — بنك أسئلة شامل", questions: ibl204 },
  { moduleSlug: "uni-205", bankSlug: "uni-mcq-bank", bankTitle: "قضايا الصحة المجتمعية — بنك أسئلة شامل", questions: uni205 },
];

async function main() {
  const overwrite = process.env.SEED_OVERWRITE === "1";
  let ok = true;
  for (const b of banks) {
    const r = await seedBank({ ...b, overwrite });
    if (!r) ok = false;
  }
  console.log(ok ? "\n[mcq-seed] All banks seeded successfully." : "\n[mcq-seed] Some banks failed.");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("[mcq-seed] error:", err);
  process.exit(1);
});
