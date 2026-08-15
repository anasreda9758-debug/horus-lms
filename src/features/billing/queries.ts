import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { plan, subscription } from "./schema";
import { user } from "../auth/schema";

export async function getPlans() {
  return db.query.plan.findMany({
    orderBy: (p) => [asc(p.priceEg)],
  });
}

export async function getActiveSubscription(userId: string) {
  return db.query.subscription.findFirst({
    where: and(eq(subscription.userId, userId), eq(subscription.status, "active")),
    with: { plan: true },
  });
}

export async function isPremiumActive(userId: string) {
  const sub = await getActiveSubscription(userId);
  return !!sub && sub.expiresAt > new Date();
}

export async function activateSubscription(userId: string, planId: string) {
  const planRow = await db.query.plan.findFirst({ where: eq(plan.id, planId) });
  if (!planRow) return null;

  const now = new Date();
  await db
    .update(subscription)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(subscription.userId, userId), eq(subscription.status, "active")));

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
