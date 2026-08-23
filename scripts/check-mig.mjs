import postgres from "postgres";
import { readFileSync } from "node:fs";
const sql = postgres("postgres://postgres:lms_dev@localhost:5432/lms");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
console.log("journal entries:", journal.entries.map(e => ({ idx: e.idx, tag: e.tag })));
const applied = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
console.log("applied count:", applied.length);
await sql.end();
