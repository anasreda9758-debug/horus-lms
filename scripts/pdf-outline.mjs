/**
 * Reads a PDF's embedded outline (bookmarks) and prints titles + page numbers.
 * Usage: npx tsx scripts/pdf-outline.mjs "<pdf-relative-path>"
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require_ = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const CONTENT_ROOT = process.env.CONTENT_ROOT ?? "C:/work/projects";
const rel = process.argv[2];
if (!rel) {
  console.error("usage: node pdf-outline.mjs <pdf-relative-path>");
  process.exit(1);
}

const data = new Uint8Array(readFileSync(join(CONTENT_ROOT, rel)));
const doc = await pdfjs.getDocument({ data, useSystemFonts: false, verbosity: 0 }).promise;
console.log(`pages: ${doc.numPages}`);

async function resolvePage(item) {
  try {
    let dest = item.dest;
    if (typeof dest === "string") dest = await doc.getDestination(dest);
    if (!Array.isArray(dest) || dest.length === 0) return null;
    const pageIndex = await doc.getPageIndex(dest[0]);
    return pageIndex + 1;
  } catch {
    return null;
  }
}

async function walk(items, depth = 0) {
  for (const it of items ?? []) {
    const page = await resolvePage(it);
    console.log(`${"  ".repeat(depth)}p${page ?? "?"}  ${it.title}`);
    if (it.items?.length) await walk(it.items, depth + 1);
  }
}

const outline = await doc.getOutline();
if (!outline || outline.length === 0) {
  console.log("(no embedded outline)");
} else {
  await walk(outline);
}
