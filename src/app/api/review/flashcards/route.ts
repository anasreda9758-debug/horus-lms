import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { lecture } from "@/features/curriculum/schema";
import { isPremiumActive } from "@/features/billing/queries";
import { getAiUsageToday, FREE_DAILY_LIMIT, recordAiUsage } from "@/features/ai/queries";
import { generateJson } from "@/shared/ai-client";
import { createFlashcards, getDueFlashcards } from "@/features/review/queries";

const SYSTEM_PROMPT =
  "You are a medical education assistant. Create concise medical flashcards strictly from the content given. " +
  "Return ONLY valid JSON, in English, in exactly this shape with no extra text: " +
  '[{"front": "question or term", "back": "answer"}]. Stay strictly inside the source content.';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let lectureId: string;
  try {
    const body = await request.json();
    if (typeof body.lectureId !== "string" || body.lectureId.length === 0) {
      return NextResponse.json({ error: "invalid lectureId" }, { status: 400 });
    }
    lectureId = body.lectureId;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const lectureRow = await db.query.lecture.findFirst({
    where: eq(lecture.id, lectureId),
    with: { module: true },
  });
  if (!lectureRow || !lectureRow.module) {
    return NextResponse.json({ error: "lecture not found" }, { status: 400 });
  }
  if (!lectureRow.content || lectureRow.content.trim().length === 0) {
    return NextResponse.json({ error: "no readable content for this lecture" }, { status: 400 });
  }

  const premium = await isPremiumActive(session.user.id);
  if (!lectureRow.module.isFree && !premium) {
    return NextResponse.json({ error: "premium required" }, { status: 403 });
  }
  if (!premium) {
    const usedToday = await getAiUsageToday(session.user.id);
    if (usedToday >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: "free_limit",
          message: `وصلت إلى حد ${FREE_DAILY_LIMIT} عملية ذكية مجانية اليوم. فعّل Premium لفتح استخدام غير محدود.`,
        },
        { status: 429 },
      );
    }
  }

  const body = lectureRow.content.slice(0, 15000);
  try {
    const { data, inputTokens, outputTokens } = await generateJson<{ front: string; back: string }[]>({
      system: SYSTEM_PROMPT,
      user: `Create 12 flashcards.\nContent:\n${body}`,
    });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
    }
    const count = await createFlashcards(session.user.id, lectureId, data.slice(0, 12));
    await recordAiUsage({
      userId: session.user.id,
      lectureId,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      inputTokens,
      outputTokens,
    });
    return NextResponse.json({ count });
  } catch (err) {
    console.error("flashcards error:", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cards = await getDueFlashcards(session.user.id);
  return NextResponse.json({
    cards: cards.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      lectureTitle: c.lecture?.title ?? null,
    })),
  });
}
