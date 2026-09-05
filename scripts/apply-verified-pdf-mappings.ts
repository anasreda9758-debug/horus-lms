import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/shared/db";
import { lecture } from "../src/features/curriculum/schema";

type Mapping = {
  databaseLectureId: string;
  startPage: number;
  endPage: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  ambiguous: boolean;
};

type Audit = { pdfs: Array<{ lectureMappings?: Mapping[] }> };

const auditArg = process.argv.find((arg) => arg.startsWith("--audit="));
if (!auditArg) {
  throw new Error("Usage: tsx scripts/apply-verified-pdf-mappings.ts --audit=<path>");
}

const audit = JSON.parse(readFileSync(resolve(auditArg.slice("--audit=".length)), "utf8")) as Audit;
const mappings = audit.pdfs
  .flatMap((pdf) => pdf.lectureMappings ?? [])
  .filter((mapping) =>
    (mapping.confidence === "HIGH" || mapping.confidence === "MEDIUM") &&
    !mapping.ambiguous &&
    Number.isInteger(mapping.startPage) &&
    Number.isInteger(mapping.endPage) &&
    mapping.startPage > 0 &&
    mapping.endPage >= mapping.startPage,
  );

let applied = 0;
let missing = 0;
for (const mapping of mappings) {
  const updated = await db
    .update(lecture)
    .set({ pdfPageStart: mapping.startPage, pdfPageEnd: mapping.endPage, updatedAt: new Date() })
    .where(eq(lecture.id, mapping.databaseLectureId))
    .returning({ id: lecture.id });
  if (updated.length === 0) missing++;
  else applied++;
}

console.log(`[pdf-mappings] applied=${applied} missing=${missing} skipped=${audit.pdfs.flatMap((pdf) => pdf.lectureMappings ?? []).length - mappings.length}`);
