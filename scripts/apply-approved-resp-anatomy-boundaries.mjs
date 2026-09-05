import "dotenv/config";
import postgres from "postgres";

// Reviewed from the actual title pages in semester 2/RESP/RESP.pdf.
const boundaries = [
  ["rs-201-anatomy-anatomy-of-nose", 1, 28],
  ["rs-201-anatomy-anatomy-of-pharynx", 29, 69],
  ["rs-201-anatomy-anatomy-of-larynx-trachea-bronchi", 70, 129],
  ["rs-201-anatomy-anatomy-of-lung", 130, 162],
  ["rs-201-anatomy-anatomy-of-thoracic-wall-diaphragm", 163, 186],
  ["rs-201-anatomy-blood-supply-innervation-of-thoracic-wall", 187, 206],
  ["rs-201-anatomy-development-of-the-respiratory-system", 207, 246],
];
const source = "semester 2/RESP/RESP.pdf";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  for (const [slug, start, end] of boundaries) {
    const updated = await sql`
      UPDATE lecture SET pdf_page_start = ${start}, pdf_page_end = ${end}, updated_at = now()
      WHERE slug = ${slug} AND pdf_file = ${source} RETURNING id
    `;
    if (updated.length !== 1) throw new Error(`Expected one lecture: ${slug}`);
  }
  console.log(`[resp-anatomy] approved=${boundaries.length}`);
} finally {
  await sql.end();
}
