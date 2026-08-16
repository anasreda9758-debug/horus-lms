// One-shot bootstrap for a fresh staging DB (run by the Docker `seed` service
// after `migrate`). Idempotent so it is safe to run on every deploy:
//   - admin, plans, quiz banks: upsert (skip when already present)
//   - curriculum import: runs ONLY when the module table is empty
//       (import-content.ts wipes modules, so re-running it on every deploy
//        would destroy progress/attempts; the guard prevents that)
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { db } from "../src/shared/db";
import { curriculumModule } from "../src/features/curriculum/schema";

function run(script: string): void {
  console.log(`[staging-seed] --- ${script} ---`);
  const res = spawnSync("npx", ["tsx", script], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    console.error(`[staging-seed] '${script}' failed with status ${res.status}`);
    process.exit(res.status ?? 1);
  }
}

async function main() {
  run("scripts/seed-admin.ts");
  run("scripts/seed-plans.ts");

  const existing = await db.select({ id: curriculumModule.id }).from(curriculumModule);
  if (existing.length === 0) {
    console.log("[staging-seed] module table empty — importing curriculum content...");
    run("scripts/import-content.ts");
  } else {
    console.log(`[staging-seed] ${existing.length} module(s) present — skipping content import`);
  }

  run("scripts/seed-quiz.ts");

  console.log("[staging-seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[staging-seed] error:", err);
  process.exit(1);
});
