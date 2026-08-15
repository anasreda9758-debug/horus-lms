// Logical backup via JSON (no pg_dump needed). Works on Windows dev AND in CI/Linux.
// Schema restores come from drizzle migrations (source of truth); this dumps/restores data.
//
// Usage:
//   npm run db:backup                 -> write backups/lms-<stamp>.json, prune to BACKUP_KEEP (14)
//   npm run db:restore -- <file>      -> truncate + reload all tables from the JSON file
import "dotenv/config";
import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const BACKUP_DIR = join(process.cwd(), "backups");
const KEEP = Number(process.env.BACKUP_KEEP ?? 14);
const action = process.argv[2] ?? "backup";

function tableIdent(schema, name) {
  return `"${schema}"."${name}"`;
}

async function backup() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const tables = await sql`
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
    order by tablename
  `;

  const data = {};
  for (const t of tables) {
    const id = tableIdent(t.schemaname, t.tablename);
    const rows = await sql.unsafe(
      `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as x from ${id} t`,
    );
    data[t.tablename] = rows[0].x ?? [];
  }

  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const file = join(BACKUP_DIR, `lms-${stamp}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), tables: data },
      null,
      2,
    ),
  );

  const files = readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json")).sort();
  let pruned = 0;
  while (files.length > KEEP) {
    rmSync(join(BACKUP_DIR, files.shift()));
    pruned++;
  }

  console.log(`[backup] wrote ${file} (${Object.keys(data).length} tables)`);
  if (pruned > 0) console.log(`[backup] pruned ${pruned} old backup(s)`);
  await sql.end();
}

async function restore(file) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  await sql.unsafe(`set session_replication_role = replica`);
  try {
    for (const [name, rows] of Object.entries(raw.tables)) {
      const id = tableIdent("public", name);
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`[restore] ${name}: empty (truncating)`);
        await sql.unsafe(`truncate ${id} cascade`);
        continue;
      }
      await sql.unsafe(`truncate ${id} cascade`);
      await sql.unsafe(
        `insert into ${id} select * from jsonb_populate_recordset(NULL::${id}, $1::jsonb)`,
        [rows],
      );
      console.log(`[restore] ${name}: ${rows.length} rows`);
    }
  } finally {
    await sql.unsafe(`set session_replication_role = default`);
  }
  console.log(`[restore] done from ${file}`);
  await sql.end();
}

try {
  if (action === "backup") {
    await backup();
  } else if (action === "restore") {
    const file = process.argv[3];
    if (!file) {
      console.error("[backup] usage: npm run db:restore -- <backups/lms-....json>");
      process.exit(1);
    }
    await restore(file);
  } else {
    console.error(`[backup] unknown action '${action}' (use backup|restore)`);
    process.exit(1);
  }
} catch (err) {
  console.error("[backup] error:", err);
  await sql.end().catch(() => {});
  process.exit(1);
}
