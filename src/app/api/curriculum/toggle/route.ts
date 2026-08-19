import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { lectureProgress } from "@/features/curriculum/schema";
import { awardXp, updateStreak } from "@/features/gamification/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let lectureId: string;
  let moduleSlug: string | null = null;
  try {
    const body = await request.json();
    if (typeof body.lectureId !== "string" || body.lectureId.length === 0) {
      return NextResponse.json({ error: "invalid lectureId" }, { status: 400 });
    }
    lectureId = body.lectureId;
    if (typeof body.moduleSlug === "string") moduleSlug = body.moduleSlug;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const existing = await db
    .select({ id: lectureProgress.id })
    .from(lectureProgress)
    .where(
      and(
        eq(lectureProgress.userId, session.user.id),
        eq(lectureProgress.lectureId, lectureId),
      ),
    )
    .limit(1);

  let completed: boolean;
  try {
    if (existing.length > 0) {
      await db.delete(lectureProgress).where(eq(lectureProgress.id, existing[0].id));
      completed = false;
    } else {
      await db.insert(lectureProgress).values({
        id: randomUUID(),
        userId: session.user.id,
        lectureId,
      });
      completed = true;
      awardXp(session.user.id, "lecture_complete", lectureId).catch(() => {});
      updateStreak(session.user.id).catch(() => {});
    }
  } catch {
    return NextResponse.json({ error: "lecture not found" }, { status: 400 });
  }

  revalidatePath("/curriculum");
  revalidatePath("/dashboard");
  if (moduleSlug) revalidatePath(`/curriculum/${moduleSlug}`);

  return NextResponse.json({ completed });
}
