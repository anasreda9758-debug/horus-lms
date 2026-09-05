/**
 * Builds a review-only boundary report for PDFs that are shared by lectures.
 * A candidate is accepted only when every meaningful word from the lecture
 * title appears in the actual page heading area. Nothing in this script writes
 * to the curriculum database.
 *
 * Usage: node scripts/audit-pdf-boundaries.mjs [--module=ibl-204]
 */
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import postgres from "postgres";

const moduleArg = process.argv.find((arg) => arg.startsWith("--module="));
const moduleSlug = moduleArg?.slice("--module=".length) ?? null;
const root = resolve(process.env.CONTENT_ROOT ?? "C:/work/projects");
const output = resolve("reports/title-boundary-candidates.json");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const STOP = new Set([
  "lecture", "seminar", "practical", "and", "the", "of", "for", "with", "to", "in", "on", "used", "system",
  "diseases", "disease", "drugs", "drug", "anatomy", "physiology", "histology", "pathology", "microbiology", "biochemistry",
]);

function words(value) {
  return value
    .toLowerCase()
    .replace(/addaptive/g, "adaptive")
    .replace(/haem/g, "hem")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP.has(word));
}

function textFrom(items) {
  return items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
}

function candidateFor(title, pageText, topText) {
  const tokens = words(title);
  if (tokens.length === 0) return null;
  const allText = pageText.toLowerCase().replace(/addaptive/g, "adaptive").replace(/haem/g, "hem");
  const heading = topText.toLowerCase().replace(/addaptive/g, "adaptive").replace(/haem/g, "hem");
  const hits = tokens.filter((token) => allText.includes(token));
  const topHits = tokens.filter((token) => heading.includes(token));
  if (hits.length !== tokens.length || topHits.length !== tokens.length) return null;
  const phrase = tokens.join(" ");
  const score = 100 + tokens.length * 10 + (heading.includes(phrase) ? 20 : 0);
  return { score, matchedTokens: tokens };
}

const lectures = await sql.unsafe(
  `SELECT l.id, l.slug, l.title, l.pdf_file, m.slug AS module_slug
   FROM lecture l JOIN module m ON m.id = l.module_id
   WHERE l.pdf_file IS NOT NULL
     ${moduleSlug ? "AND m.slug = $1" : ""}
   ORDER BY m.slug, l.pdf_file, l."order"`,
  moduleSlug ? [moduleSlug] : [],
);
await sql.end();

const byFile = new Map();
for (const lecture of lectures) {
  const list = byFile.get(lecture.pdf_file) ?? [];
  list.push(lecture);
  byFile.set(lecture.pdf_file, list);
}

const report = { generatedAt: new Date().toISOString(), module: moduleSlug, files: [] };
for (const [relativeFile, fileLectures] of byFile) {
  if (fileLectures.length < 2) continue;
  const absoluteFile = join(root, relativeFile);
  const document = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(absoluteFile)), verbosity: 0, disableFontFace: true }).promise;
  const pages = [];
  for (let number = 1; number <= document.numPages; number++) {
    const page = await document.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter((item) => item.str?.trim());
    const topItems = items.filter((item) => (item.transform?.[5] ?? 0) >= viewport.height * 0.55);
    pages.push({ number, text: textFrom(items), topText: textFrom(topItems) });
    page.cleanup();
  }
  await document.destroy();

  const mappings = fileLectures.map((lecture) => {
    const candidates = pages
      .map((page) => {
        const result = candidateFor(lecture.title, page.text, page.topText);
        return result ? { page: page.number, topText: page.topText.slice(0, 250), ...result } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.page - b.page);
    return {
      lectureId: lecture.id,
      slug: lecture.slug,
      title: lecture.title,
      bestCandidate: candidates[0] ?? null,
      candidates: candidates.slice(0, 5),
    };
  });
  report.files.push({ file: relativeFile, pages: document.numPages, lectureCount: fileLectures.length, mappings });
  console.log(`${relativeFile}: ${mappings.filter((mapping) => mapping.bestCandidate).length}/${mappings.length} heading matches`);
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2), "utf8");
console.log(`report: ${output}`);
