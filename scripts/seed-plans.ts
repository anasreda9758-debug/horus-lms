import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/shared/db";
import { plan } from "../src/features/billing/schema";

const PLANS = [
  { id: "monthly", name: "شهري", priceEg: 119, durationDays: 30 },
  { id: "quarterly", name: "ربع سنوي", priceEg: 399, durationDays: 90 },
  { id: "annual", name: "سنوي", priceEg: 599, durationDays: 365 },
];

async function main() {
  for (const p of PLANS) {
    const existing = await db.query.plan.findFirst({ where: eq(plan.id, p.id) });
    if (existing) {
      await db.update(plan).set(p).where(eq(plan.id, p.id));
      console.log(`[seed-plans] updated: ${p.id} (${p.name})`);
    } else {
      await db.insert(plan).values(p);
      console.log(`[seed-plans] created: ${p.id} (${p.name})`);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-plans] error:", err);
  process.exit(1);
});
