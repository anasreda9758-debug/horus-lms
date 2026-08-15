import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { lecture } from "@/features/curriculum/schema";
import { isPremiumActive } from "@/features/billing/queries";
import { getAiUsageToday, FREE_DAILY_LIMIT, recordAiUsage } from "@/features/ai/queries";
import { generateJson } from "@/shared/ai-client";
import { createClinicalCase, listMyCases } from "@/features/review/queries";

const SYSTEM_PROMPT =
  "You are a medical educator. Create one realistic medical clinical case based strictly on the content given. " +
  'Return ONLY valid JSON, in English, in exactly this shape with no extra text: ' +
  '{"case": "...", "questions": ["...", "...", "..."], "model_answers": ["...", "...", "..."]}. ' +
  "Do not add information not supported by the source.";

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
    const { data, inputTokens, outputTokens } = await generateJson<{
      case: string;
      questions: string[];
      model_answers: string[];
    }>({
      system: SYSTEM_PROMPT,
      user: `Create one clinical case.\nContent:\n${body}`,
    });
    if (
      !data ||
      typeof data.case !== "string" ||
      !Array.isArray(data.questions) ||
      !Array.isArray(data.model_answers)
    ) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
    }
    const caseId = await createClinicalCase(session.user.id, lectureId, data);
    await recordAiUsage({
      userId: session.user.id,
      lectureId,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      inputTokens,
      outputTokens,
    });
    return NextResponse.json({ caseId, case: data.case, questions: data.questions });
  } catch (err) {
    console.error("clinical case error:", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cases = await listMyCases(session.user.id);
  return NextResponse.json({
    cases: cases.map((c) => ({
      id: c.id,
      caseText: c.caseText,
      questions: JSON.parse(c.questionsJson) as string[],
      lectureTitle: c.lecture?.title ?? null,
      createdAt: c.createdAt,
    })),
  });
}
