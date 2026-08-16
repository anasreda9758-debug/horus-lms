import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/shared/db";
import { lecture, curriculumModule } from "../src/features/curriculum/schema";

const modules = [
  {
    name: "التشريح — الوحدة 1",
    slug: "anatomy-module-1",
    description: "مدخل إلى علم التشريح: المصطلحات، المستويات، والأنظمة الأساسية.",
    order: 1,
    isFree: false,
    term: 1,
    lectures: [
      {
        title: "المصطلحات التشريحية ومستويات الجسم",
        slug: "anatomical-terminology",
        order: 1,
        durationMin: 25,
        summary:
          "تعريف الاتجاهات التشريحية القياسية، المستويات (السهمي والإكليلي والأفقي)، والمصطلحات الموضعية مثل أمامي/خلفي وأنسي/وحشي.",
      },
      {
        title: "الجهاز الهيكلي: نظرة عامة",
        slug: "skeletal-system-overview",
        order: 2,
        durationMin: 30,
        summary:
          "أقسام الهيكل العظمي (المحوري والطرفي)، أنواع العظام، والوظائف الرئيسية للهيكل العظمي.",
      },
      {
        title: "الجهاز العضلي: نظرة عامة",
        slug: "muscular-system-overview",
        order: 3,
        durationMin: 28,
        summary:
          "أنواع العضلات (هيكلية وملساء وقلبية)، أساسيات الانقباض العضلي، ومجموعات العضلات الكبرى.",
      },
      {
        title: "الجهاز القلبي الوعائي: نظرة عامة",
        slug: "cardiovascular-overview",
        order: 4,
        durationMin: 32,
        summary:
          "تكوّن القلب والدورة الدموية الصغرى والكبرى، والشرايين والأوردة الرئيسية في الجسم.",
      },
    ],
  },
  {
    name: "الجهاز التنفسي: نظرة عامة",
    slug: "respiratory-overview",
    description: "محتوى مدفوع تجريبي لعرض بوابة الاشتراك.",
    order: 2,
    isFree: false,
    term: 2,
    lectures: [
      {
        title: "تشريح المجاري التنفسية",
        slug: "respiratory-tract-anatomy",
        order: 1,
        durationMin: 26,
        summary:
          "الأنف والبلعوم والحنجرة والقصبة الهوائية والشُعب — البنية والوظيفة.",
      },
      {
        title: "آلية التنفس وتبادل الغازات",
        slug: "breathing-mechanics",
        order: 2,
        durationMin: 34,
        summary:
          "آلية الشهيق والزفير، الضغوط داخل الصدر، وتبادل الأكسجين وثاني أكسيد الكربون في الحويصلات.",
      },
    ],
  },
];

async function main() {
  const existing = await db.select({ id: curriculumModule.id }).from(curriculumModule).limit(1);
  if (existing.length > 0) {
    console.log("[seed-curriculum] modules already present — skipping");
    process.exit(0);
  }

  for (const m of modules) {
    const moduleId = randomUUID();
    await db.insert(curriculumModule).values({
      id: moduleId,
      name: m.name,
      slug: m.slug,
      description: m.description,
      order: m.order,
      isFree: m.isFree,
      term: m.term ?? 1,
    });
    for (const l of m.lectures) {
      await db.insert(lecture).values({
        id: randomUUID(),
        moduleId,
        title: l.title,
        slug: l.slug,
        summary: l.summary,
        order: l.order,
        durationMin: l.durationMin,
      });
    }
    console.log(`[seed-curriculum] ${m.name} (${m.lectures.length} lectures)`);
  }

  const total = modules.reduce((s, m) => s + m.lectures.length, 0);
  console.log(`[seed-curriculum] done — ${modules.length} modules, ${total} lectures`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-curriculum] error:", err);
  process.exit(1);
});
