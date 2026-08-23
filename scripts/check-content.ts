import "dotenv/config";
import { db } from "../src/shared/db";
import { lecture } from "../src/features/curriculum/schema";
import { curriculumModule } from "../src/features/curriculum/schema";
import { sql } from "drizzle-orm";

async function main() {
  // Total lectures and content status
  const totals = await db.execute(sql`
    SELECT COUNT(*) as total, 
           COUNT(content) as has_content,
           COUNT(*) FILTER (WHERE content IS NULL) as no_content
    FROM lecture
  `);
  console.log("=== Global ===");
  console.log(totals[0]);

  // Per-module breakdown
  const perModule = await db.execute(sql`
    SELECT m.slug, m.name, COUNT(l.id) as lectures,
           COUNT(l.content) as with_content,
           COUNT(*) FILTER (WHERE l.content IS NULL) as without_content
    FROM module m
    LEFT JOIN lecture l ON l.module_id = m.id
    GROUP BY m.id, m.slug, m.name
    ORDER BY m."order"
  `);
  console.log("\n=== Per Module ===");
  console.table(perModule);

  // Sample lectures with content from semester 2
  const sample = await db.execute(sql`
    SELECT l.title, m.slug, length(l.content) as content_len
    FROM lecture l
    JOIN module m ON m.id = l.module_id
    WHERE m.slug IN ('cvs-202','rs-201','rau-203','ibl-204')
      AND l.content IS NOT NULL
    ORDER BY m.slug
    LIMIT 10
  `);
  console.log("\n=== Sample semester 2 lectures with content ===");
  console.table(sample);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
