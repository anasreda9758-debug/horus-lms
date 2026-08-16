import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { plan, subscription } from "./schema";
import { user } from "../auth/schema";

export async function getPlans() {
  return db.query.plan.findMany({
    where: eq(plan.active, true),
    orderBy: (p) => [asc(p.scope), asc(p.priceEg)],
  });
}

export type ActiveSubscription = {
  id: string;
  planId: string;
  status: string;
  startsAt: Date;
  expiresAt: Date;
  plan: {
    id: string;
    name: string;
    priceEg: number;
    durationDays: number;
    scope: string;
    scopeRef: string | null;
  };
};

export async function getActiveSubscriptions(userId: string): Promise<ActiveSubscription[]> {
  return db.query.subscription.findMany({
    where: and(eq(subscription.userId, userId), eq(subscription.status, "active")),
    with: { plan: true },
  });
}

// True when the user holds an active subscription that covers the given module.
// Year unlocks everything; term unlocks all modules of that term; module unlocks that module.
export async function hasModuleAccess(
  userId: string,
  module: { id: string; slug: string; isFree: boolean; term: number },
) {
  if (module.isFree) return true;
  const subs = await getActiveSubscriptions(userId);
  const now = new Date();
  for (const s of subs) {
    if (s.expiresAt <= now) continue;
    const p = s.plan;
    if (p.scope === "year") return true;
    if (p.scope === "term" && String(p.scopeRef) === String(module.term)) return true;
    if (p.scope === "module" && p.scopeRef === module.slug) return true;
  }
  return false;
}

// True when the user holds ANY active subscription (used for AI limits).
export async function hasAnySubscription(userId: string) {
  const subs = await getActiveSubscriptions(userId);
  return subs.some((s) => s.expiresAt > new Date());
}

// Enrich every module with its resolved access flag.
export async function withModuleAccess<T extends { id: string; slug: string; isFree: boolean; term: number }>(
  userId: string,
  modules: T[],
): Promise<(T & { access: boolean })[]> {
  const subs = await getActiveSubscriptions(userId);
  const now = new Date();
  const hasYear = subs.some((s) => s.expiresAt > now && s.plan.scope === "year");
  const termSet = new Set(
    subs.filter((s) => s.expiresAt > now && s.plan.scope === "term").map((s) => String(s.plan.scopeRef)),
  );
  const moduleSet = new Set(
    subs.filter((s) => s.expiresAt > now && s.plan.scope === "module").map((s) => s.plan.scopeRef),
  );
  return modules.map((m) => ({
    ...m,
    access: m.isFree || hasYear || termSet.has(String(m.term)) || moduleSet.has(m.slug),
  }));
}

export async function activateSubscription(userId: string, planId: string) {
  const planRow = await db.query.plan.findFirst({ where: eq(plan.id, planId) });
  if (!planRow) return null;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + planRow.durationDays);

  // Replace any active subscription of the same plan so re-activating renews cleanly.
  await db
    .update(subscription)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(subscription.userId, userId), eq(subscription.planId, planId), eq(subscription.status, "active")));

  await db.insert(subscription).values({
    id: randomUUID(),
    userId,
    planId,
    status: "active",
    startsAt: now,
    expiresAt,
  });
  return planRow;
}

export async function deactivateSubscription(userId: string) {
  await db
    .update(subscription)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(subscription.userId, userId), eq(subscription.status, "active")));
}

export async function listStudents() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.role, "student"))
    .orderBy(desc(user.createdAt));
}

export async function getSubscriptionForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db.query.subscription.findMany({
    where: (s, { and, eq, inArray }) =>
      and(inArray(s.userId, userIds), eq(s.status, "active")),
    with: { plan: true },
  });
}
