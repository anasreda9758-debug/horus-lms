// Applies pending drizzle migrations from ./drizzle without needing drizzle-kit.
// Compatible with drizzle-kit's bookkeeping (schema `drizzle`, table
// `__drizzle_migrations`, `hash` = sha256 of the SQL file). Usage: node scripts/migrate.mjs
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const DRIZZLE_DIR = join(process.cwd(), "drizzle");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

try {
  await sql.unsafe(`create schema if not exists drizzle`);
  await sql.unsafe(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
  const appliedRows = await sql`select hash from drizzle.__drizzle_migrations`;
  const applied = new Set(appliedRows.map((r) => r.hash));

  const journal = JSON.parse(readFileSync(join(DRIZZLE_DIR, "meta", "_journal.json"), "utf8"));
  let count = 0;
  for (const entry of journal.entries) {
    const file = join(DRIZZLE_DIR, `${entry.tag}.sql`);
    const content = readFileSync(file, "utf8");
    const hash = sha256(content);
    if (applied.has(hash)) continue;
    await sql.unsafe(content);
    await sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${Date.now()})`;
    console.log(`[migrate] applied ${entry.tag}`);
    count++;
  }
  console.log(count === 0 ? "[migrate] up to date" : `[migrate] applied ${count} migration(s)`);
  process.exit(0);
} catch (err) {
  console.error("[migrate] error:", err);
  process.exit(1);
} finally {
  await sql.end().catch(() => {});
}
