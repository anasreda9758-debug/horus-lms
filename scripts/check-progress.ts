import "dotenv/config";
import { db } from "../src/shared/db";
import { sql } from "drizzle-orm";

async function main() {
  const r = await db.execute(sql`SELECT COUNT(*) as total, COUNT(summary_json) as has_summary, COUNT(mindmap_json) as has_mindmap FROM lecture`);
  console.log(JSON.stringify(r[0]));
  const r2 = await db.execute(sql`SELECT m.slug, COUNT(l.id) as total, COUNT(l.summary_json) as done FROM lecture l JOIN module m ON m.id=l.module_id GROUP BY m.slug ORDER BY m.slug`);
  console.table(r2);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
