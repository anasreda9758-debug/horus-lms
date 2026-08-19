/**
 * Migration: Create OSPE exam + answer key tables.
 * Run with: npx tsx scripts/migrate-ospe-exam.ts
 */

async function main() {
  const postgres = (await import("postgres")).default;
  const sql = postgres("postgres://postgres:lms_dev@localhost:5432/lms", { max: 1 });

  console.log("[migration] Creating ospe_answer_key table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ospe_answer_key (
      id TEXT PRIMARY KEY,
      folder TEXT NOT NULL,
      file_name TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      identification TEXT,
      findings TEXT,
      differential TEXT,
      management TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ospe_answer_key_folder_idx ON ospe_answer_key(folder);
    CREATE INDEX IF NOT EXISTS ospe_answer_key_lookup_idx ON ospe_answer_key(folder, file_name);
  `);

  console.log("[migration] Creating ospe_rubric table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ospe_rubric (
      id TEXT PRIMARY KEY,
      answer_key_id TEXT NOT NULL REFERENCES ospe_answer_key(id) ON DELETE CASCADE,
      criterion TEXT NOT NULL,
      max_points INTEGER NOT NULL DEFAULT 1,
      "order" INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS ospe_rubric_key_idx ON ospe_rubric(answer_key_id);
  `);

  console.log("[migration] Creating ospe_exam table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ospe_exam (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      folder TEXT,
      station_count INTEGER NOT NULL DEFAULT 10,
      time_per_station_sec INTEGER NOT NULL DEFAULT 60,
      total_time_limit_sec INTEGER NOT NULL DEFAULT 600,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      total_score INTEGER,
      max_possible_score INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ospe_exam_user_idx ON ospe_exam(user_id);
    CREATE INDEX IF NOT EXISTS ospe_exam_status_idx ON ospe_exam(status);
  `);

  console.log("[migration] Creating ospe_exam_station table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ospe_exam_station (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES ospe_exam(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL,
      folder TEXT NOT NULL,
      file_name TEXT NOT NULL,
      answer_key_id TEXT REFERENCES ospe_answer_key(id),
      student_answer TEXT,
      score INTEGER,
      time_spent_sec INTEGER,
      answered_at TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS ospe_exam_station_exam_idx ON ospe_exam_station(exam_id);
  `);

  console.log("[migration] Done!");
  await sql.end();
}

main().catch((e) => {
  console.error("[migration] FAILED:", e);
  process.exit(1);
});
