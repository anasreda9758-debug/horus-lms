/**
 * Boundaries reviewed against the visible title slides in IBL.pdf.
 * This is deliberately a small, auditable batch; no inferred mappings are used.
 */
import "dotenv/config";
import postgres from "postgres";

const boundaries = [
  { slug: "ibl-204-physiology-general-functions-of-blood", start: 123, end: 150 },
  { slug: "ibl-204-physiology-blood-indices", start: 151, end: 157 },
  { slug: "ibl-204-physiology-platelets-haemostasis", start: 158, end: 180 },
  { slug: "ibl-204-physiology-natural-anticoagulation-mechanism", start: 181, end: 190 },
];

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  for (const boundary of boundaries) {
    const updated = await sql.unsafe(
      `UPDATE lecture
       SET pdf_page_start = $1, pdf_page_end = $2, updated_at = now()
       WHERE slug = $3 AND pdf_file = 'semester 2/IBL/IBL.pdf'
       RETURNING title`,
      [boundary.start, boundary.end, boundary.slug],
    );
    if (updated.length !== 1) throw new Error(`Expected one IBL source lecture: ${boundary.slug}`);
  }
  console.log(`[ibl-boundaries] approved=${boundaries.length}`);
} finally {
  await sql.end();
}
