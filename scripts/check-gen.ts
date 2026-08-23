import "dotenv/config";
import { db } from "../src/shared/db";
import { sql } from "drizzle-orm";

async function main() {
  const r = await db.execute(sql`
    SELECT COUNT(*) as total, 
           COUNT(summary_json) as has_summary, 
           COUNT(mindmap_json) as has_mindmap 
    FROM lecture
  `);
  console.log(JSON.stringify(r[0]));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
