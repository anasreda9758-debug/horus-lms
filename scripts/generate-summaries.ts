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

const MODEL = "openai/gpt-oss-20b";

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
      if ((err.message?.includes("Rate limit") || err.message?.includes("Request too large")) && attempt < retries - 1) {
        const wait = err.message?.includes("Request too large") ? 5000 : (attempt + 1) * 10_000;
        console.log(`    ${err.message?.includes("Request too large") ? "Too large" : "Rate limited"}, waiting ${wait / 1000}s...`);
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

const SUMMARY_SYSTEM = `أنشئ ملخصاً طبياً. أرجع JSON فقط:
{"overview":"2-3 جمل","keyPoints":["نقطة","..."],"clinicalPearls":["لؤلؤة"],"references":[]}
اكتب بالعربية. 5-8 نقاط رئيسية. 2-4 لؤلؤات سريرية.`;

const MINDMAP_SYSTEM = `أنشئ خريطة ذهنية طبية. أرجع JSON فقط:
{"label":"اسم المحاضرة","children":[{"label":"قسم","children":[{"label":"تفصيل"}]}]}
3-6 أقسام رئيسية، 2-5 تفريعات لكل قسم. بالعربية.`;

const MAX_CONTENT_CHARS = 3_000;

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

  const SLUGS = onlySlug ? [onlySlug] : [
    "cvs-202", "rs-201", "rau-203", "ibl-204",
    "ahe-101", "ppg-102", "pmb-103",
  ];

  const whereClause = onlySlug
    ? eq(curriculumModule.slug, onlySlug)
    : undefined;

  const modules = await db.query.curriculumModule.findMany({
    where: whereClause,
    orderBy: (m, { asc }) => [asc(m.order)],
  });

  let totalGenerated = 0;
  const totalSkipped = 0;
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

        // Rate limit: wait between requests (8K TPM = ~2 req/min for 3K tokens each)
        await new Promise((r) => setTimeout(r, 15000));
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
