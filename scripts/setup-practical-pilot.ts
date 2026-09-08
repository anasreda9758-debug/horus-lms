/** Explicit, local-only ADDITIVE setup. Never run a general migration/reseed here. */
import { readFile } from "node:fs/promises";
import { db, client } from "../src/shared/db";
import { practicalImage, practicalQuestion } from "../src/features/practical/schema";
import { makeDevelopmentFixtures } from "../src/features/practical/fixtures";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!process.argv.includes("--local-fixtures") || process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/lms") {
    throw new Error("Refusing setup: requires --local-fixtures and the local lms development database, never production");
  }
  const [before] = await client.unsafe("SELECT (SELECT count(*)::int FROM module) AS modules, (SELECT count(*)::int FROM lecture) AS lectures");
  if (before.modules !== 7 || before.lectures !== 248) throw new Error("STOP: curriculum counts conflict with the recovered 7 modules / 248 lectures. No recovery attempted.");
  const modules = await client.unsafe("SELECT id, study_year FROM module WHERE slug = 'rau-203'");
  if (modules.length !== 1) throw new Error("STOP: expected exactly one Renal module");
  const migration = await readFile(new URL("../drizzle/0014_renal_anatomy_pilot.sql", import.meta.url), "utf8");
  const statements = migration.split("--> statement-breakpoint").map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
  if (!statements.every((s) => /^CREATE (TABLE|UNIQUE INDEX) IF NOT EXISTS practical_/i.test(s)) || /\b(DROP|TRUNCATE|DELETE|UPDATE|ALTER)\b/i.test(statements.join("\n"))) throw new Error("Refusing a non-additive migration");
  await client.begin(async (tx) => { for (const statement of statements) await tx.unsafe(statement); });
  const fixtures = makeDevelopmentFixtures(modules[0].id, modules[0].study_year);
  await db.transaction(async (tx) => {
    await tx.insert(practicalImage).values(fixtures.image).onConflictDoNothing();
    await tx.insert(practicalQuestion).values(fixtures.questions).onConflictDoNothing();
  });
  const [after] = await client.unsafe("SELECT (SELECT count(*)::int FROM module) AS modules, (SELECT count(*)::int FROM lecture) AS lectures");
  console.log(JSON.stringify({ before, after, fixtureQuestions: fixtures.questions.length, realQuestionsImported: 0, note: "Only pilot tables and DRAFT_AI non-medical development fixtures. General migration history untouched." }));
}
main().finally(() => client.end()).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
