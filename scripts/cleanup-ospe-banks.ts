import "dotenv/config";
import { db } from "../src/shared/db";
import { question, questionBank, questionOption } from "../src/features/practice/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
  const slugs = ["ospe-cvs", "ospe-resp", "ospe-renal"];
  const banks = await db.select().from(questionBank).where(inArray(questionBank.slug, slugs));
  console.log(`Found ${banks.length} banks to delete`);

  for (const b of banks) {
    const qs = await db.select().from(question).where(eq(question.bankId, b.id));
    console.log(`  ${b.slug}: ${qs.length} questions`);
    for (const q of qs) {
      await db.delete(questionOption).where(eq(questionOption.questionId, q.id));
    }
    await db.delete(question).where(eq(question.bankId, b.id));
    await db.delete(questionBank).where(eq(questionBank.id, b.id));
    console.log(`  Deleted: ${b.slug}`);
  }
  process.exit(0);
}

main();
