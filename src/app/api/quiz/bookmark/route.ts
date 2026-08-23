import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { questionBookmark } from "@/features/practice/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// GET /api/quiz/bookmark?questionId=xxx — check if bookmarked
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get("questionId");
  if (!questionId) return NextResponse.json({ error: "missing questionId" }, { status: 400 });

  const [existing] = await db
    .select({ id: questionBookmark.id })
    .from(questionBookmark)
    .where(and(eq(questionBookmark.userId, session.user.id), eq(questionBookmark.questionId, questionId)))
    .limit(1);

  return NextResponse.json({ bookmarked: !!existing, bookmarkId: existing?.id ?? null });
}

// POST /api/quiz/bookmark — toggle bookmark
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { questionId } = await request.json();
  if (!questionId) return NextResponse.json({ error: "missing questionId" }, { status: 400 });

  const [existing] = await db
    .select({ id: questionBookmark.id })
    .from(questionBookmark)
    .where(and(eq(questionBookmark.userId, session.user.id), eq(questionBookmark.questionId, questionId)))
    .limit(1);

  if (existing) {
    await db.delete(questionBookmark).where(eq(questionBookmark.id, existing.id));
    return NextResponse.json({ bookmarked: false });
  } else {
    await db.insert(questionBookmark).values({
      id: randomUUID(),
      userId: session.user.id,
      questionId,
    });
    return NextResponse.json({ bookmarked: true });
  }
}
