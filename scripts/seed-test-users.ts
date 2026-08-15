// Seeds 100 test student accounts for scale validation (M6).
// Guarantees a credential hash that matches the shared password by creating a
// dedicated template user through the auth API, then reusing that hash.
// Idempotent and self-healing: re-points existing test accounts to the hash and
// tops up to COUNT without duplicating.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "../src/shared/db";
import { account, user } from "../src/features/auth/schema";
import { auth } from "../src/shared/auth";

const COUNT = Number(process.env.TEST_USERS ?? 100);
const PASSWORD = process.env.TEST_USER_PASSWORD ?? "Passw0rd!2026";
const DOMAIN = "test.horus.edu.eg";
const TEMPLATE_EMAIL = "template@lms.invalid";

async function resolveTemplateHash() {
  const existing = await db
    .select({ hash: account.password })
    .from(account)
    .innerJoin(user, eq(account.userId, user.id))
    .where(
      and(
        eq(account.providerId, "credential"),
        eq(user.email, TEMPLATE_EMAIL),
        isNotNull(account.password),
      ),
    )
    .limit(1);
  if (existing.length > 0) return existing[0].hash;

  const res = await auth.api.signUpEmail({
    body: { email: TEMPLATE_EMAIL, password: PASSWORD, name: "Template" },
    headers: new Headers({ origin: "http://localhost:3000" }),
  });
  if (!res.user) {
    console.error("[seed-test-users] template signUpEmail failed:", JSON.stringify(res));
    process.exit(1);
  }
  const created = await db
    .select({ hash: account.password })
    .from(account)
    .innerJoin(user, eq(account.userId, user.id))
    .where(
      and(
        eq(account.providerId, "credential"),
        eq(user.email, TEMPLATE_EMAIL),
        isNotNull(account.password),
      ),
    )
    .limit(1);
  if (created.length === 0) {
    console.error("[seed-test-users] template hash not found after sign-up");
    process.exit(1);
  }
  return created[0].hash;
}

async function main() {
  const hash = await resolveTemplateHash();
  if (!hash) {
    console.error("[seed-test-users] failed to resolve template password hash");
    process.exit(1);
  }
  console.log(`[seed-test-users] template hash resolved (${hash.slice(0, 16)}…)`);

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`${user.email} like ${`%@${DOMAIN}`}`);
  const already = existing.length;

  if (already > 0) {
    await db
      .update(account)
      .set({ password: hash, updatedAt: new Date() })
      .where(inArray(account.userId, existing.map((u) => u.id)));
    console.log(`[seed-test-users] re-pointed ${already} existing test accounts to shared password`);
  }

  if (already >= COUNT) {
    console.log(`[seed-test-users] ${already} test users present — done`);
    process.exit(0);
  }

  const now = new Date();
  const users = [];
  const accounts = [];
  for (let i = already + 1; i <= COUNT; i++) {
    const userId = randomUUID();
    users.push({
      id: userId,
      name: `طالب اختبار ${i}`,
      email: `student${String(i).padStart(3, "0")}@${DOMAIN}`,
      emailVerified: true,
      role: "student",
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.insert(user).values(users);
  await db.insert(account).values(accounts);

  console.log(`[seed-test-users] created ${users.length} test users (${already} → ${COUNT})`);
  console.log(`[seed-test-users] shared password: ${PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-test-users] error:", err);
  process.exit(1);
});
