// Extracts text from the module PDFs on the Desktop (curriculum + sample questions)
// so the assistant can audit the questions/answers offline.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PDFParse } from "pdf-parse";

const SRC_DIR = "C:/Users/anasr/Desktop/8";
const OUT_DIR = "C:/Users/anasr/AppData/Local/Temp/opencode/module-pdfs";

const FILES = [
  "Module 1.pdf.pdf",
  "Module 2.pdf",
  "Module 3 past exams.pdf",
  "CVS MODULE.pdf.pdf",
  "module resp.pdf",
  "RENAL.pdf.pdf",
  "IBL Module.pdf.pdf",
];

async function extract(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const f of FILES) {
    const full = join(SRC_DIR, f);
    const outName = f.replace(/\.pdf$/i, "").replace(/[^a-z0-9_-]+/gi, "_") + ".txt";
    const out = join(OUT_DIR, outName);
    try {
      const text = await extract(full);
      await writeFile(out, text, "utf8");
      console.log(`${f}: ${text.length} chars -> ${outName}`);
    } catch (e) {
      console.error(`${f}: FAILED ${(e as Error).message}`);
    }
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
