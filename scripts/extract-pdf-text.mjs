import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("usage: node scripts/extract-pdf-text.mjs <pdf-path>");
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  console.log(`--- PAGE ${i} ---`);
  console.log(content.items.map((item) => item.str).join(" ").replace(/\s+/g, " "));
  page.cleanup();
}
await doc.destroy();
