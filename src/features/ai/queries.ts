import { and, eq, gte } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { aiUsage } from "./schema";

export const FREE_DAILY_LIMIT = 15;

export async function getAiUsageToday(userId: string, now = new Date()) {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ id: aiUsage.id })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, startOfDay)));
  return rows.length;
}

export async function recordAiUsage(params: {
  userId: string;
  lectureId: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  await db.insert(aiUsage).values({
    id: randomUUID(),
    userId: params.userId,
    lectureId: params.lectureId,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
  });
}
