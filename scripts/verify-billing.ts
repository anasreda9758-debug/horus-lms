import "dotenv/config";
import { db } from "../src/shared/db";
import {
  getPlans,
  activateSubscription,
  getActiveSubscriptions,
  hasModuleAccess,
  hasAnySubscription,
  withModuleAccess,
  deactivateSubscription,
} from "../src/features/billing/queries";
import { curriculumModule } from "../src/features/curriculum/schema";
import { user } from "../src/features/auth/schema";
import { eq } from "drizzle-orm";

async function main() {
  const plans = await getPlans();
  console.log("[verify-billing] active plans:", plans.map((p) => `${p.id}=${p.priceEg}ج scope=${p.scope}`).join(", "));

  const admin = await db.query.user.findFirst({ where: eq(user.role, "admin") });
  if (!admin) throw new Error("no admin user");
  const uid = admin.id;
  console.log("[verify-billing] using admin user:", admin.email);

  await deactivateSubscription(uid);

  // 1) No subscription -> no access anywhere (all modules paid).
  const modules = await db.query.curriculumModule.findMany();
  let anyFree = false;
  for (const m of modules) {
    if (m.isFree) anyFree = true;
    if (await hasModuleAccess(uid, m)) {
      console.log(`[FAIL] expected NO access to ${m.slug} without subscription`);
      process.exit(1);
    }
  }
  if (anyFree) {
    console.log("[WARN] found a free module in DB (expected all paid after re-import)");
  }
  console.log(`[OK] no access without subscription (${modules.length} modules)`);

  // 2) Activate a single module plan -> only that module is accessible.
  const ahe = plans.find((p) => p.id === "module-ahe-101")!;
  await activateSubscription(uid, ahe.id);
  const rs = await db.query.curriculumModule.findFirst({ where: eq(curriculumModule.slug, "rs-201") });
  const aheM = await db.query.curriculumModule.findFirst({ where: eq(curriculumModule.slug, "ahe-101") });
  if (!(await hasModuleAccess(uid, aheM!))) { console.log("[FAIL] ahe-101 should be accessible after module plan"); process.exit(1); }
  if (await hasModuleAccess(uid, rs!)) { console.log("[FAIL] rs-201 should NOT be accessible with only ahe-101 plan"); process.exit(1); }
  console.log("[OK] module plan grants exactly that module");

  // 3) Add a term plan -> term 1 modules all accessible.
  const term1 = plans.find((p) => p.id === "term-1")!;
  await activateSubscription(uid, term1.id);
  const ppg = await db.query.curriculumModule.findFirst({ where: eq(curriculumModule.slug, "ppg-102") });
  if (!(await hasModuleAccess(uid, ppg!))) { console.log("[FAIL] ppg-102 should be accessible via term-1"); process.exit(1); }
  if (await hasModuleAccess(uid, rs!)) { console.log("[FAIL] rs-201 (term 2) should NOT be accessible via term-1"); process.exit(1); }
  console.log("[OK] term plan unlocks all term modules; stacking works (module + term coexist)");

  // 4) Year plan -> everything accessible.
  const year = plans.find((p) => p.id === "year")!;
  await activateSubscription(uid, year.id);
  if (!(await hasModuleAccess(uid, rs!))) { console.log("[FAIL] rs-201 should be accessible via year"); process.exit(1); }
  if (!(await hasAnySubscription(uid))) { console.log("[FAIL] hasAnySubscription should be true"); process.exit(1); }
  console.log("[OK] year plan unlocks everything; hasAnySubscription true");

  // 5) withModuleAccess enrichment.
  const enriched = await withModuleAccess(uid, modules.map((m) => ({ ...m, access: false })));
  if (!enriched.every((m) => m.access)) { console.log("[FAIL] withModuleAccess should mark all accessible with year"); process.exit(1); }
  console.log("[OK] withModuleAccess enrichment works");

  // 6) Multiple active subscriptions coexist.
  const active = await getActiveSubscriptions(uid);
  const scopes = active.map((s) => s.plan.scope).sort();
  if (scopes.join(",") !== "module,term,year") { console.log("[FAIL] expected module,term,year coexisting, got", scopes); process.exit(1); }
  console.log("[OK] multiple active subscriptions coexist:", scopes.join(","));

  await deactivateSubscription(uid);
  console.log("[verify-billing] ALL CHECKS PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("[verify-billing] error:", err);
  process.exit(1);
});
