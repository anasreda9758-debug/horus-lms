import "dotenv/config";
import postgres from "postgres";

// Visually reviewed against the scanned source PDF: Patho.pdf, pages 180–187.
const slug = "pmb-103-pathology-neoplasia-classification-2";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const result = await sql`
    UPDATE lecture
    SET pdf_page_start = 180, pdf_page_end = 187, updated_at = now()
    WHERE slug = ${slug} AND pdf_file = 'semester 1/Patho/Patho.pdf'
    RETURNING title
  `;
  if (result.length !== 1) throw new Error(`Expected one source lecture for ${slug}`);
  console.log(`[pathology-boundary] approved=${slug} pages=180-187`);
} finally {
  await sql.end();
}
