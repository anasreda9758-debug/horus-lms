/**
 * Migration: Add difficulty, spaced-repetition, and timed quiz support.
 * Run: npx tsx scripts/migrate-difficulty.ts
 */
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:lms_dev@localhost:5432/lms";

async function migrate() {
  const sql = postgres(DATABASE_URL);

  console.log("[migration] Adding difficulty to question...");
  await sql`ALTER TABLE question ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium'`;

  console.log("[migration] Adding timing columns to quiz_attempt...");
  await sql`ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS difficulty text`;
  await sql`ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS time_limit_sec integer`;
  await sql`ALTER TABLE quiz_attempt ADD COLUMN IF NOT EXISTS elapsed_sec integer NOT NULL DEFAULT 0`;

  console.log("[migration] Adding time_spent_ms to quiz_answer...");
  await sql`ALTER TABLE quiz_answer ADD COLUMN IF NOT EXISTS time_spent_ms integer NOT NULL DEFAULT 0`;

  console.log("[migration] Creating question_review table...");
  await sql`
    CREATE TABLE IF NOT EXISTS question_review (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      question_id text NOT NULL REFERENCES question(id) ON DELETE CASCADE,
      ease_factor integer NOT NULL DEFAULT 250,
      interval integer NOT NULL DEFAULT 0,
      repetitions integer NOT NULL DEFAULT 0,
      next_review timestamp NOT NULL DEFAULT NOW(),
      last_review timestamp,
      total_reviews integer NOT NULL DEFAULT 0,
      correct_count integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT NOW(),
      updated_at timestamp NOT NULL DEFAULT NOW()
    )
  `;

  // Indexes
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS question_review_user_question_idx ON question_review (user_id, question_id)`;
  await sql`CREATE INDEX IF NOT EXISTS question_review_next_idx ON question_review (user_id, next_review)`;

  console.log("[migration] Done!");
  await sql.end();
}

migrate().catch((e) => {
  console.error("[migration] Failed:", e);
  process.exit(1);
});
