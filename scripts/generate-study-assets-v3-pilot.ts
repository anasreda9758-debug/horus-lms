import "dotenv/config";
import { inArray } from "drizzle-orm";
import { db } from "../src/shared/db";
import { lecture } from "../src/features/curriculum/schema";
import {
  buildStructuredMindmap,
  buildStructuredSummary,
} from "../src/features/study-assets/structured-assets";

const PILOT_SLUGS = [
  "cvs-202-anatomy-external-features-of-the-heart",
  "cvs-202-physiology-cardiac-cycle",
  "rs-201-pathology-pneumonia-suppurative-lung-diseases",
  "cvs-202-pharmacology-drugs-used-to-treat-hypertension",
  "ahe-101-histology-membranous-non-membranous-organelles",
] as const;

async function main() {
  const lectures = await db.query.lecture.findMany({
    where: inArray(lecture.slug, [...PILOT_SLUGS]),
    with: { module: true },
  });
  const bySlug = new Map(lectures.map((item) => [item.slug, item]));
  const missing = PILOT_SLUGS.filter((slug) => !bySlug.has(slug));
  if (missing.length) {
    throw new Error(`Pilot lecture(s) not found: ${missing.join(", ")}`);
  }

  for (const slug of PILOT_SLUGS) {
    const item = bySlug.get(slug)!;
    if (!item.content || item.content.trim().length < 100) {
      throw new Error(`Pilot lecture has insufficient source content: ${slug}`);
    }
    const summary = buildStructuredSummary(item.title, item.content);
    const mindmap = buildStructuredMindmap(item.title, summary);
    await db
      .update(lecture)
      .set({ summaryJson: summary, mindmapJson: mindmap, updatedAt: new Date() })
      .where(inArray(lecture.id, [item.id]));
    console.log(JSON.stringify({
      slug,
      module: item.module?.name ?? null,
      subject: item.subject,
      quality: summary.quality,
      reviewStatus: summary.reviewStatus,
    }));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
