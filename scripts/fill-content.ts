import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/shared/db";
import { lecture } from "../src/features/curriculum/schema";

const LECTURES_DIR = "C:/Users/anasr/AppData/Local/Temp/opencode/lectures";
const MAX_CHARS = 120_000;

function cleanText(raw: string): string {
  return raw.replace(/\d+ of \d+\s*--\s*/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

const KEYWORD_MAP: Record<string, string[]> = {
  "rs-201": ["resp", "respiratory"],
  "cvs-202": ["cvs", "cardiovascular", "cardiac"],
  "rau-203": ["renal", "urinary"],
  "ibl-204": ["ibl", "immune", "blood", "lymph"],
  "pmb-103": ["patho", "micro", "biochemistry"],
  "ppg-102": ["physiology", "pharmacology", "molecular"],
  "ahe-101": ["anatomy", "embryology", "histology"],
};

function findTextForModule(moduleSlug: string): string | null {
  const kws = KEYWORD_MAP[moduleSlug] ?? [];
  if (!kws.length) return null;
  const files = readdirSync(LECTURES_DIR).filter((f) => f.endsWith(".txt"));
  for (const file of files) {
    const lower = file.toLowerCase();
    if (kws.some((kw) => lower.includes(kw))) {
      try {
        return cleanText(readFileSync(join(LECTURES_DIR, file), "utf-8")).slice(0, MAX_CHARS);
      } catch { continue; }
    }
  }
  return null;
}

async function main() {
  const modules = await db.query.curriculumModule.findMany({
    orderBy: (m, { asc }) => [asc(m.order)],
  });

  let updated = 0;
  for (const mod of modules) {
    const allLectures = await db.query.lecture.findMany({
      where: (l, { eq }) => eq(l.moduleId, mod.id),
    });
    const emptyLectures = allLectures.filter((l) => !l.content || l.content.trim().length === 0);
    if (emptyLectures.length === 0) {
      console.log(`${mod.slug}: all ${allLectures.length} lectures have content ✓`);
      continue;
    }

    console.log(`${mod.slug}: ${emptyLectures.length}/${allLectures.length} lectures missing content`);
    const moduleText = findTextForModule(mod.slug);
    if (!moduleText) {
      console.log(`  ⚠ no pre-extracted text found for ${mod.slug}`);
      continue;
    }

    // Distribute module-level text to all empty lectures
    for (const l of emptyLectures) {
      await db.update(lecture).set({ content: moduleText }).where(eq(lecture.id, l.id));
      updated++;
    }
    console.log(`  → filled ${emptyLectures.length} lectures (${(moduleText.length / 1024).toFixed(0)} KB each)`);
  }

  console.log(`\nDone. Updated ${updated} lectures total.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
