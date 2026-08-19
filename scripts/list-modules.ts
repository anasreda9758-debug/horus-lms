import "dotenv/config";
import { db } from "../src/shared/db";
import { curriculumModule } from "../src/features/curriculum/schema";

async function main() {
  const mods = await db.select().from(curriculumModule).orderBy(curriculumModule.order);
  for (const m of mods) {
    console.log(`${m.slug} — ${m.name} (term ${m.term})`);
  }
  process.exit(0);
}

main();
