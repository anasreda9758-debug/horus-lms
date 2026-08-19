import { and, asc, desc, eq, lte, isNull, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { plan, subscription } from "./schema";
import { user } from "../auth/schema";

export const GRACE_PERIOD_DAYS = 3;

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
  graceExpiresAt: Date | null;
  plan: {
    id: string;
    name: string;
    priceEg: number;
    durationDays: number;
    scope: string;
    scopeRef: string | null;
  };
};

/**
 * Get subscriptions that are active or in grace period.
 * Grace period: 3 days after expiry, user still has access but sees a renewal warning.
 */
export async function getActiveSubscriptions(userId: string): Promise<ActiveSubscription[]> {
  return db.query.subscription.findMany({
    where: and(
      eq(subscription.userId, userId),
      or(
        eq(subscription.status, "active"),
        eq(subscription.status, "grace"),
      ),
    ),
    with: { plan: true },
  });
}

/**
 * Get only strictly active subscriptions (not in grace period).
 */
export async function getStrictActiveSubscriptions(userId: string): Promise<ActiveSubscription[]> {
  return db.query.subscription.findMany({
    where: and(
      eq(subscription.userId, userId),
      eq(subscription.status, "active"),
    ),
    with: { plan: true },
  });
}

/**
 * Check if a subscription is currently within its grace period.
 */
export function isInGracePeriod(sub: ActiveSubscription): boolean {
  if (sub.status !== "grace") return false;
  if (!sub.graceExpiresAt) return false;
  return new Date() <= sub.graceExpiresAt;
}

/**
 * True when the user holds an active (or grace-period) subscription that covers the given module.
 * Year unlocks everything; term unlocks all modules of that term; module unlocks that module.
 */
export async function hasModuleAccess(
  userId: string,
  module: { id: string; slug: string; isFree: boolean; term: number },
) {
  if (module.isFree) return true;
  const subs = await getActiveSubscriptions(userId);
  const now = new Date();
  for (const s of subs) {
    // Skip expired (non-grace) subs
    if (s.status === "active") {
      // Active: check expiry
      if (s.expiresAt <= now) continue;
    } else if (s.status === "grace") {
      // Grace: check grace expiry
      if (!s.graceExpiresAt || s.graceExpiresAt <= now) continue;
    }
    const p = s.plan;
    if (p.scope === "year") return true;
    if (p.scope === "term" && String(p.scopeRef) === String(module.term)) return true;
    if (p.scope === "module" && p.scopeRef === module.slug) return true;
  }
  return false;
}

/**
 * True when the user holds ANY active subscription (used for AI limits).
 */
export async function hasAnySubscription(userId: string) {
  const subs = await getActiveSubscriptions(userId);
  const now = new Date();
  return subs.some((s) => {
    if (s.status === "active") return s.expiresAt > now;
    if (s.status === "grace") return s.graceExpiresAt && s.graceExpiresAt > now;
    return false;
  });
}

/**
 * Enrich every module with its resolved access flag.
 */
export async function withModuleAccess<T extends { id: string; slug: string; isFree: boolean; term: number }>(
  userId: string,
  modules: T[],
): Promise<(T & { access: boolean })[]> {
  const subs = await getActiveSubscriptions(userId);
  const now = new Date();

  const isCovered = (s: ActiveSubscription) => {
    if (s.status === "active" && s.expiresAt > now) return true;
    if (s.status === "grace" && s.graceExpiresAt && s.graceExpiresAt > now) return true;
    return false;
  };

  const hasYear = subs.some((s) => isCovered(s) && s.plan.scope === "year");
  const termSet = new Set(
    subs.filter((s) => isCovered(s) && s.plan.scope === "term").map((s) => String(s.plan.scopeRef)),
  );
  const moduleSet = new Set(
    subs.filter((s) => isCovered(s) && s.plan.scope === "module").map((s) => s.plan.scopeRef),
  );
  return modules.map((m) => ({
    ...m,
    access: m.isFree || hasYear || termSet.has(String(m.term)) || moduleSet.has(m.slug),
  }));
}

/**
 * Activate (or renew) a subscription after successful payment.
 * - If the user already has an active subscription to the same plan, extend it.
 * - Otherwise, create a new subscription.
 * - If the user had a higher-tier plan, we don't downgrade — just add the new one.
 */
export async function activateSubscription(userId: string, planId: string) {
  const planRow = await db.query.plan.findFirst({ where: eq(plan.id, planId) });
  if (!planRow) return null;

  const now = new Date();

  // Check for existing active subscription to the SAME plan — extend it
  const existing = await db.query.subscription.findFirst({
    where: and(
      eq(subscription.userId, userId),
      eq(subscription.planId, planId),
      eq(subscription.status, "active"),
    ),
  });

  if (existing) {
    // Extend from the later of (now, current expiry)
    const baseDate = existing.expiresAt > now ? existing.expiresAt : now;
    const newExpires = new Date(baseDate);
    newExpires.setDate(newExpires.getDate() + planRow.durationDays);

    await db
      .update(subscription)
      .set({ expiresAt: newExpires, updatedAt: now })
      .where(eq(subscription.id, existing.id));
  } else {
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + planRow.durationDays);

    await db.insert(subscription).values({
      id: randomUUID(),
      userId,
      planId,
      status: "active",
      startsAt: now,
      expiresAt,
    });
  }

  return planRow;
}

/**
 * Move expired subscriptions to grace period (runs daily via cron).
 * Subscriptions that expired within the last GRACE_PERIOD_DAYS are moved to "grace".
 * Subscriptions past grace are marked "expired".
 */
export async function processExpiredSubscriptions(): Promise<{ movedToGrace: number; fullyExpired: number }> {
  const now = new Date();
  const graceDeadline = new Date(now);
  graceDeadline.setDate(graceDeadline.getDate() - GRACE_PERIOD_DAYS);

  // Active subs past expiry → move to grace
  const movedToGrace = await db
    .update(subscription)
    .set({
      status: "grace",
      graceExpiresAt: new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000),
      updatedAt: now,
    })
    .where(and(
      eq(subscription.status, "active"),
      lte(subscription.expiresAt, now),
    ))
    .returning();

  // Grace subs past grace deadline → fully expire
  const fullyExpired = await db
    .update(subscription)
    .set({ status: "expired", updatedAt: now })
    .where(and(
      eq(subscription.status, "grace"),
      lte(subscription.graceExpiresAt, now),
    ))
    .returning();

  return { movedToGrace: movedToGrace.length, fullyExpired: fullyExpired.length };
}

/**
 * Downgrade: cancel a specific subscription immediately (e.g., admin action or refund).
 */
export async function cancelSubscription(subscriptionId: string, userId: string) {
  await db
    .update(subscription)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(
      eq(subscription.id, subscriptionId),
      eq(subscription.userId, userId),
    ));
}

export async function deactivateSubscription(userId: string) {
  await db
    .update(subscription)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(subscription.userId, userId), eq(subscription.status, "active")));
}

/**
 * Get subscription status summary for the user (for UI display).
 */
export async function getSubscriptionSummary(userId: string) {
  const subs = await getActiveSubscriptions(userId);
  const now = new Date();
  const active = subs.filter((s) => {
    if (s.status === "active") return s.expiresAt > now;
    if (s.status === "grace") return s.graceExpiresAt && s.graceExpiresAt > now;
    return false;
  });

  const inGrace = subs.filter((s) => s.status === "grace" && s.graceExpiresAt && s.graceExpiresAt > now);

  return {
    hasActive: active.length > 0,
    hasGrace: inGrace.length > 0,
    subscriptions: active,
    graceSubscriptions: inGrace,
  };
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
