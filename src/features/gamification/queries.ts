import { db } from "@/shared/db";
import { sql, eq, desc } from "drizzle-orm";
import { userProfile, xpLog } from "./schema";

const XP_REWARDS = {
  lecture_complete: 10,
  quiz_correct: 5,
  quiz_complete_bonus: 20,
  flashcard_review: 2,
  case_complete: 15,
  daily_streak: 5,
  battle_win: 30,
  battle_lose: 10,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

function calcLevel(totalXp: number): number {
  return Math.floor(totalXp / 200) + 1;
}

function xpForNextLevel(level: number): number {
  return level * 200;
}

export async function awardXp(userId: string, reason: XpReason, referenceId?: string) {
  const amount = XP_REWARDS[reason];

  // Get current XP first
  const [existing] = await db.execute(sql`
    SELECT total_xp FROM user_profile WHERE user_id = ${userId}
  `);
  const currentXp = (existing as any)?.total_xp ?? 0;
  const newXp = currentXp + amount;
  const newLevel = calcLevel(newXp);

  // Upsert profile
  await db.execute(sql`
    INSERT INTO user_profile (user_id, total_xp, level, streak, last_active_date, updated_at)
    VALUES (${userId}, ${newXp}, ${newLevel}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      total_xp = ${newXp},
      level = ${newLevel},
      updated_at = CURRENT_TIMESTAMP
  `);

  // Log XP
  await db.execute(sql`
    INSERT INTO xp_log (user_id, amount, reason, reference_id)
    VALUES (${userId}, ${amount}, ${reason}, ${referenceId ?? null})
  `);

  // Return updated profile
  const [profile] = await db.execute(sql`
    SELECT total_xp, level, streak FROM user_profile WHERE user_id = ${userId}
  `);

  return {
    amount,
    reason,
    totalXp: (profile as any)?.total_xp ?? amount,
    level: (profile as any)?.level ?? calcLevel(amount),
    xpToNext: xpForNextLevel((profile as any)?.level ?? calcLevel(amount)) - ((profile as any)?.total_xp ?? amount),
  };
}

export async function getProfile(userId: string) {
  const [profile] = await db.execute(sql`
    SELECT * FROM user_profile WHERE user_id = ${userId}
  `);

  if (!profile) {
    // Create default profile
    await db.execute(sql`
      INSERT INTO user_profile (user_id, total_xp, level, streak, last_active_date)
      VALUES (${userId}, 0, 1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO NOTHING
    `);
    return {
      totalXp: 0,
      level: 1,
      streak: 1,
      battlesWon: 0,
      battlesLost: 0,
      xpToNext: 200,
    };
  }

  const p = profile as any;
  return {
    totalXp: p.total_xp,
    level: p.level,
    streak: p.streak,
    battlesWon: p.battles_won,
    battlesLost: p.battles_lost,
    xpToNext: xpForNextLevel(p.level) - p.total_xp,
  };
}

export async function getLeaderboard(limit = 20) {
  const rows = await db.execute(sql`
    SELECT
      up.user_id as "userId",
      u.name as "userName",
      up.total_xp as "totalXp",
      up.level,
      up.battles_won as "battlesWon",
      up.battles_lost as "battlesLost"
    FROM user_profile up
    JOIN "user" u ON u.id = up.user_id
    ORDER BY up.total_xp DESC
    LIMIT ${limit}
  `);

  return (rows as any[]).map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    userName: r.userName,
    totalXp: r.totalXp,
    level: r.level,
    battlesWon: r.battlesWon,
    battlesLost: r.battlesLost,
  }));
}

export async function getXpHistory(userId: string, limit = 20) {
  const rows = await db.execute(sql`
    SELECT amount, reason, reference_id, created_at
    FROM xp_log
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return (rows as any[]).map((r) => ({
    amount: r.amount,
    reason: r.reason,
    referenceId: r.reference_id,
    createdAt: r.created_at,
  }));
}
