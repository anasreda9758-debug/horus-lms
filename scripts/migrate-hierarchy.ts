/**
 * Migration: University hierarchy + audit log + module.subjectId
 * Run: npx tsx scripts/migrate-hierarchy.ts
 */
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:lms_dev@localhost:5432/lms";

async function migrate() {
  const sql = postgres(DATABASE_URL);

  console.log("[migration] Creating university hierarchy tables...");

  await sql`
    CREATE TABLE IF NOT EXISTS university (
      id text PRIMARY KEY,
      name text NOT NULL,
      name_ar text,
      slug text NOT NULL UNIQUE,
      created_at timestamp NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS faculty (
      id text PRIMARY KEY,
      university_id text NOT NULL REFERENCES university(id) ON DELETE CASCADE,
      name text NOT NULL,
      name_ar text,
      slug text NOT NULL UNIQUE,
      created_at timestamp NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS program (
      id text PRIMARY KEY,
      faculty_id text NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
      name text NOT NULL,
      name_ar text,
      slug text NOT NULL UNIQUE,
      duration_years integer NOT NULL DEFAULT 5,
      created_at timestamp NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS academic_year (
      id text PRIMARY KEY,
      program_id text NOT NULL REFERENCES program(id) ON DELETE CASCADE,
      name text NOT NULL,
      "order" integer NOT NULL DEFAULT 1,
      created_at timestamp NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS semester (
      id text PRIMARY KEY,
      academic_year_id text NOT NULL REFERENCES academic_year(id) ON DELETE CASCADE,
      name text NOT NULL,
      term integer NOT NULL,
      created_at timestamp NOT NULL DEFAULT NOW()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS subject (
      id text PRIMARY KEY,
      semester_id text NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
      name text NOT NULL,
      name_ar text,
      slug text NOT NULL UNIQUE,
      "order" integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT NOW()
    )`;

  console.log("[migration] Creating audit_log table...");
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      user_name text,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id text,
      entity_name text,
      old_data text,
      new_data text,
      created_at timestamp NOT NULL DEFAULT NOW()
    )`;

  await sql`CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log (user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (entity_type, entity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at)`;

  console.log("[migration] Adding subject_id to module...");
  await sql`ALTER TABLE module ADD COLUMN IF NOT EXISTS subject_id text REFERENCES subject(id) ON DELETE SET NULL`;

  console.log("[migration] Done!");
  await sql.end();
}

migrate().catch((e) => {
  console.error("[migration] Failed:", e);
  process.exit(1);
});
