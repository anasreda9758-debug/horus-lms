import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import postgres from "postgres";

const contentRoot = resolve(process.env.CONTENT_ROOT ?? "C:/work/projects");
const outputRoot = resolve(process.env.LECTURE_PDF_ROOT ?? join(contentRoot, "lecture-pdfs"));
const python = process.env.PYTHON ?? "python";
const maxPages = Number(process.env.MAX_LECTURE_PDF_PAGES ?? 60);
const slugsArg = process.argv.find((arg) => arg.startsWith("--slugs="));
const requestedSlugs = slugsArg
  ? slugsArg.slice("--slugs=".length).split(",").map((slug) => slug.trim()).filter(Boolean)
  : null;
const splitter = join(process.cwd(), "scripts", "split-lecture-pdf.py");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

await mkdir(outputRoot, { recursive: true });
const lectures = await sql.unsafe(
  `SELECT id, slug, title, pdf_file, pdf_page_start, pdf_page_end
   FROM lecture
   WHERE pdf_file IS NOT NULL
     AND pdf_page_start IS NOT NULL
     AND pdf_page_end IS NOT NULL
     AND pdf_page_end - pdf_page_start + 1 <= $1
     ${requestedSlugs ? "AND slug = ANY($2)" : ""}
   ORDER BY pdf_file, pdf_page_start, slug`,
  requestedSlugs ? [maxPages, requestedSlugs] : [maxPages],
);

let created = 0;
let skipped = 0;
let failed = 0;
for (const lecture of lectures) {
  const source = resolve(contentRoot, lecture.pdf_file);
  const relativeOutput = `lecture-pdfs/${lecture.slug}.pdf`;
  const target = resolve(contentRoot, relativeOutput);
  if (!source.startsWith(contentRoot) || !target.startsWith(contentRoot) || !existsSync(source)) {
    console.error(`[split] missing or unsafe source: ${lecture.title}`);
    failed++;
    continue;
  }

  const result = spawnSync(python, [splitter, source, target, String(lecture.pdf_page_start), String(lecture.pdf_page_end)], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    console.error(`[split] failed ${lecture.title}: ${result.stderr || result.stdout}`);
    failed++;
    continue;
  }

  await sql.unsafe(
    "UPDATE lecture SET pdf_file = $1, pdf_page_start = 1, pdf_page_end = $2, updated_at = now() WHERE id = $3",
    [relativeOutput, lecture.pdf_page_end - lecture.pdf_page_start + 1, lecture.id],
  );
  created++;
}

await sql.end();
console.log(`[split] created=${created} skipped=${skipped} failed=${failed} output=${outputRoot}`);
if (failed > 0) process.exit(1);
