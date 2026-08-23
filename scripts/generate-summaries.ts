import "dotenv/config";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "../src/shared/db";
import { lecture, curriculumModule } from "../src/features/curriculum/schema";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const groq = createOpenAICompatible({
  name: "groq",
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "allam-2-7b";

async function aiJson<T>(system: string, user: string, retries = 3): Promise<T | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { text } = await generateText({
        model: groq.chatModel(MODEL),
        system,
        prompt: user,
        abortSignal: AbortSignal.timeout(60_000),
      });
      const cleaned = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      try { return JSON.parse(cleaned) as T; } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
          try { return JSON.parse(cleaned.slice(start, end + 1)) as T; } catch { return null; }
        }
        return null;
      }
    } catch (err: any) {
      if (err.message?.includes("Rate limit") && attempt < retries - 1) {
        const wait = (attempt + 1) * 10_000;
        console.log(`    Rate limited, waiting ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  return null;
}

type SummaryJson = {
  overview: string;
  keyPoints: string[];
  clinicalPearls: string[];
  references: string[];
};

type MindmapJson = {
  label: string;
  children: { label: string; children?: { label: string }[] }[];
};

const SUMMARY_SYSTEM = `أنت مساعد طبي متخصص. أنشئ ملخصاً احترافياً للمحاضرة الطبية التالية.
أرجع JSON فقط بدون أي نص إضافي.

التنسيق المطلوب:
{
  "overview": "ملخص عام في 2-3 جمل عن موضوع المحاضرة",
  "keyPoints": ["نقطة رئيسية 1", "نقطة رئيسية 2", ...],  // 5-8 نقاط
  "clinicalPearls": ["لؤلؤة سريرية 1", ...],  // 2-4 لؤلؤات سريرية مهمة
  "references": []  // فارغ - سيتم ملؤه لاحقاً
}

الملاحظات:
- اكتب بالعربية الفصحى الطبية
- ركّز على المعلومات المهمة للامتحان
-_POINTS يجب أن تكون محددة ومفيدة
- Clinical Pearns هي أخطاء شائعة أو نقاط مهمة ينساها الطلاب`;

const MINDMAP_SYSTEM = `أنت مساعد طبي متخصص. أنشئ خريطة ذهنية للمحاضرة الطبية التالية.
أرجع JSON فقط بدون أي نص إضافي.

التنسيق المطلوب:
{
  "label": "اسم المحاضرة",
  "children": [
    {
      "label": "القسم الرئيسي 1",
      "children": [
        { "label": "تفاصيل فرعية 1" },
        { "label": "تفاصيل فرعية 2" }
      ]
    },
    {
      "label": "القسم الرئيسي 2",
      "children": [
        { "label": "تفاصيل فرعية" }
      ]
    }
  ]
}

الملاحظات:
- اكتب بالعربية الفصحى الطبية
- عدد الأقسام الرئيسية: 3-6
- كل قسم رئيسي له 2-5 أقسام فرعية
- الخريطة يجب أن تعكس هيكل المحاضرة بشكل منطقي
- لا تستخدم علامات تنسيق markdown`;

const MAX_CONTENT_CHARS = 8_000;

async function generateForLecture(
  l: { id: string; title: string; content: string | null; slug: string },
  moduleName: string,
) {
  if (!l.content || l.content.trim().length < 100) {
    return { summary: null, mindmap: null };
  }

  const content = l.content.slice(0, MAX_CONTENT_CHARS);
  const userPrompt = `الموديول: ${moduleName}
المحاضرة: ${l.title}

--- محتوى المحاضرة ---
${content}
--- نهاية المحتوى ---`;

  // Generate summary
  const summary = await aiJson<SummaryJson>(SUMMARY_SYSTEM, userPrompt);

  // Small delay between API calls
  await new Promise((r) => setTimeout(r, 500));

  // Generate mindmap
  const mindmap = await aiJson<MindmapJson>(MINDMAP_SYSTEM, userPrompt);

  return {
    summary: summary,
    mindmap: mindmap,
  };
}

async function main() {
  const onlySlug = process.argv[2]; // optional: only process this module slug

  const whereClause = onlySlug
    ? eq(curriculumModule.slug, onlySlug)
    : undefined;

  const modules = await db.query.curriculumModule.findMany({
    where: whereClause,
    orderBy: (m, { asc }) => [asc(m.order)],
  });

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const mod of modules) {
    const lectures = await db.query.lecture.findMany({
      where: (l, { eq }) => eq(l.moduleId, mod.id),
      orderBy: (l, { asc }) => [asc(l.order)],
    });

    // Skip lectures that already have both summary and mindmap
    const toProcess = lectures.filter(
      (l) => (!l.summaryJson || !l.mindmapJson) && l.content && l.content.trim().length > 100,
    );

    if (toProcess.length === 0) {
      console.log(`${mod.slug}: all ${lectures.length} lectures already generated ✓`);
      continue;
    }

    console.log(`${mod.slug}: ${toProcess.length}/${lectures.length} lectures to process`);

    for (const l of toProcess) {
      try {
        const { summary, mindmap } = await generateForLecture(l, mod.name);

        await db
          .update(lecture)
          .set({
            summaryJson: summary ?? undefined,
            mindmapJson: mindmap ?? undefined,
            updatedAt: new Date(),
          })
          .where(eq(lecture.id, l.id));

        totalGenerated++;
        console.log(`  ✓ ${l.title}`);

        // Rate limit: wait between requests
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err: any) {
        totalFailed++;
        console.error(`  ✗ ${l.title}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone. Generated: ${totalGenerated}, Skipped: ${totalSkipped}, Failed: ${totalFailed}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
