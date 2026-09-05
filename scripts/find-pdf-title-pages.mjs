/**
 * Search a PDF page-by-page for a lecture title without changing the database.
 * It intentionally reports context so that contents pages and unrelated mentions
 * can be rejected before a lecture boundary is approved.
 *
 * Usage:
 *   node scripts/find-pdf-title-pages.mjs "semester 2/IBL/IBL.pdf" "Platelets haemostasis"
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [relativePath, rawQuery] = process.argv.slice(2);
if (!relativePath || !rawQuery) {
  console.error("usage: node scripts/find-pdf-title-pages.mjs <pdf-relative-path> <title>");
  process.exit(1);
}

const root = process.env.CONTENT_ROOT ?? "C:/work/projects";
const queryTokens = rawQuery
  .toLowerCase()
  .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
  .split(/\s+/)
  .filter((token) => token.length >= 3);

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(readFileSync(join(root, relativePath)));
const document = await pdfjs.getDocument({ data, verbosity: 0, disableFontFace: true }).promise;

console.log(JSON.stringify({ file: relativePath, pages: document.numPages, queryTokens }, null, 2));
for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  const items = content.items.filter((item) => item.str?.trim());
  const text = items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
  const normalized = text.toLowerCase();
  const hits = queryTokens.filter((token) => normalized.includes(token));
  if (hits.length === queryTokens.length) {
    const firstIndex = Math.min(...hits.map((token) => normalized.indexOf(token)));
    const context = text.slice(Math.max(0, firstIndex - 90), firstIndex + 260);
    const topText = items
      .filter((item) => (item.transform?.[5] ?? 0) > 450)
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .slice(0, 260);
    console.log(JSON.stringify({ page: pageNumber, topText, context }, null, 0));
  }
  page.cleanup();
}
await document.destroy();
