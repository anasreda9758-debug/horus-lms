import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const auditArg = process.argv.find((arg) => arg.startsWith("--audit="));
if (!auditArg) throw new Error("Usage: node scripts/apply-verified-pdf-mappings.mjs --audit=<path>");

const audit = JSON.parse(readFileSync(resolve(auditArg.slice("--audit=".length)), "utf8"));
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

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  let applied = 0;
  let missing = 0;
  for (const mapping of mappings) {
    const updated = await sql.unsafe(
      "UPDATE lecture SET pdf_page_start = $1, pdf_page_end = $2, updated_at = now() WHERE id = $3 RETURNING id",
      [mapping.startPage, mapping.endPage, mapping.databaseLectureId],
    );
    if (updated.length === 0) missing++;
    else applied++;
  }
  console.log(`[pdf-mappings] applied=${applied} missing=${missing} skipped=${audit.pdfs.flatMap((pdf) => pdf.lectureMappings ?? []).length - mappings.length}`);
} finally {
  await sql.end();
}
