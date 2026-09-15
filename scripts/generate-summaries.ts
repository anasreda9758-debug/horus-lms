import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/shared/db";
import { lecture, curriculumModule } from "../src/features/curriculum/schema";
import { buildStructuredMindmap, buildStructuredSummary } from "../src/features/study-assets/structured-assets";

async function generateForLecture(
  l: { id: string; title: string; content: string | null; slug: string },
) {
  if (!l.content || l.content.trim().length < 100) {
    return { summary: null, mindmap: null };
  }

  const source = l.content;
  const summary = buildStructuredSummary(l.title, source);
  const mindmap = buildStructuredMindmap(l.title, summary);

  return {
    summary: summary,
    mindmap: mindmap,
  };
}

async function main() {
  const onlySlug = process.argv[2]; // optional: only process this module slug
  const onlyLectureSlug = process.argv[3]; // optional: pilot one lecture and replace its assets

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
      (l) =>
        (!onlyLectureSlug || l.slug === onlyLectureSlug) &&
        (onlyLectureSlug || !l.summaryJson || !l.mindmapJson) &&
        l.content &&
        l.content.trim().length > 100,
    );

    if (toProcess.length === 0) {
      console.log(`${mod.slug}: all ${lectures.length} lectures already generated ✓`);
      continue;
    }

    console.log(`${mod.slug}: ${toProcess.length}/${lectures.length} lectures to process`);

    for (const l of toProcess) {
      try {
        const { summary, mindmap } = await generateForLecture(l);

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
