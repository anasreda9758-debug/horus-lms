import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { hasAnySubscription } from "@/features/billing/queries";
import { getAiUsageToday, FREE_DAILY_LIMIT, recordAiUsage } from "@/features/ai/queries";
import { generateJson } from "@/shared/ai-client";
import { createFlashcards, getDueFlashcards } from "@/features/review/queries";
import { createSourceFlashcards } from "@/features/review/source-generators";
import { getAccessibleLecture } from "@/features/access/learning-access";

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

  const lectureAccess = await getAccessibleLecture(session.user, lectureId, { allowPreview: false });
  if (!lectureAccess.ok) return NextResponse.json({ error: "lecture not found" }, { status: 404 });
  const lectureRow = lectureAccess.value;
  if (!lectureRow.content || lectureRow.content.trim().length === 0) {
    return NextResponse.json({ error: "no readable content for this lecture" }, { status: 400 });
  }

  const premium = await hasAnySubscription(session.user.id);
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
  const createLocalCards = async () => {
    const cards = createSourceFlashcards(lectureRow.title, body, lectureRow.summaryJson);
    if (cards.length === 0) {
      return NextResponse.json({ error: "no_usable_content" }, { status: 400 });
    }
    const count = await createFlashcards(session.user.id, lectureId, cards);
    return NextResponse.json({ count, source: "lecture" });
  };
  if (process.env.USE_HOSTED_AI !== "true" || !process.env.GROQ_API_KEY) return createLocalCards();

  try {
    const { data, inputTokens, outputTokens } = await generateJson<{ front: string; back: string }[]>({
      system: SYSTEM_PROMPT,
      user: `Create 12 flashcards.\nContent:\n${body}`,
    });
    if (!data || data.length === 0) return createLocalCards();
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
    return createLocalCards();
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dueCards = await getDueFlashcards(session.user.id);
  const cards = [] as typeof dueCards;
  for (const card of dueCards) {
    const access = await getAccessibleLecture(session.user, card.lectureId, { allowPreview: false });
    if (access.ok) cards.push(card);
  }
  return NextResponse.json({
    cards: cards.map((c) => {
      // Legacy offline cards used a generic "key point 1" front. Keep their
      // review schedule intact but present the same stored source through the
      // clearer question style used by current cards.
      const legacyIndex = c.front.match(/\s—\skey point\s(\d+)$/i)?.[1];
      const needsEnglishFront = /[\u0600-\u06FF]/.test(c.front);
      const refreshed = c.lecture && (legacyIndex || needsEnglishFront)
        ? createSourceFlashcards(
            c.lecture.title,
            c.lecture.content ?? "",
            c.lecture.summaryJson,
          )[legacyIndex ? Number(legacyIndex) - 1 : 0]
        : null;
      return {
        id: c.id,
        front: refreshed?.front ?? c.front,
        back: refreshed?.back ?? c.back,
        lectureTitle: c.lecture?.title ?? null,
      };
    }),
  });
}
