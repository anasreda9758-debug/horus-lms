import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { generateTutorReply, type TutorMessage } from "@/shared/ai-client";
import { FREE_DAILY_LIMIT, getAiUsageToday, recordAiUsage } from "@/features/ai/queries";
import { lecture } from "@/features/curriculum/schema";

const MAX_MESSAGES = 20;

function buildSystemPrompt(title: string, summary: string | null) {
  return [
    "أنت مدرس خصوصي لطلاب الطب، تجيب بالعربية الفصحى بأسلوب واضح ومباشر.",
    "أنت مقيّد بمحتوى المحاضرة الحالية فقط: لا تجب عن أسئلة خارج هذا المحتوى، وإذا سُئلت عن موضوع خارج المحاضرة فذكّر الطالب بهذا الحد.",
    "",
    "=== محتوى المحاضرة ===",
    `العنوان: ${title}`,
    summary ? `الملخص: ${summary}` : "(لا يوجد ملخص نصي بعد)",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let lectureId: string;
  let messages: TutorMessage[];
  try {
    const body = await request.json();
    if (typeof body.lectureId !== "string" || body.lectureId.length === 0) {
      return NextResponse.json({ error: "invalid lectureId" }, { status: 400 });
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: "invalid messages" }, { status: 400 });
    }
    const clean: TutorMessage[] = [];
    for (const m of body.messages) {
      if (
        typeof m !== "object" ||
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string" ||
        m.content.length === 0 ||
        m.content.length > 4000
      ) {
        return NextResponse.json({ error: "invalid messages" }, { status: 400 });
      }
      clean.push({ role: m.role, content: m.content });
    }
    if (clean[clean.length - 1].role !== "user") {
      return NextResponse.json({ error: "last message must be from user" }, { status: 400 });
    }
    lectureId = body.lectureId;
    messages = clean;
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
  if (!lectureRow.module.isFree) {
    return NextResponse.json({ error: "premium required" }, { status: 403 });
  }

  const usedToday = await getAiUsageToday(session.user.id);
  if (usedToday >= FREE_DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: "free_limit",
        message: `وصلت إلى حد ${FREE_DAILY_LIMIT} رسالة مجانية اليوم. فعّل Premium لفتح محادثات غير محدودة.`,
      },
      { status: 429 },
    );
  }

  try {
    const { text, inputTokens, outputTokens } = await generateTutorReply({
      system: buildSystemPrompt(lectureRow.title, lectureRow.summary),
      messages,
    });
    await recordAiUsage({
      userId: session.user.id,
      lectureId,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      inputTokens,
      outputTokens,
    });
    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("tutor error:", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}
