import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { generateTutorReply, type TutorMessage } from "@/shared/ai-client";
import { FREE_DAILY_LIMIT, getAiUsageToday, recordAiUsage } from "@/features/ai/queries";
import { hasModuleAccess, hasAnySubscription } from "@/features/billing/queries";
import { lecture } from "@/features/curriculum/schema";
import { getRAGIndex, retrieve } from "@/features/rag";

const MAX_MESSAGES = 20;

function buildSystemPrompt(
  title: string,
  relevantChunks: { text: string; lectureTitle: string; moduleSlug: string }[],
  fallbackContent: string | null,
) {
  const context = relevantChunks.length > 0
    ? relevantChunks
        .map((c, i) => `--- مصدر ${i + 1}: ${c.lectureTitle} (${c.moduleSlug}) ---\n${c.text}`)
        .join("\n\n")
    : fallbackContent
      ? fallbackContent.slice(0, 8000)
      : "(لا يوجد محتوى نصي متاح)";

  return [
    "أنت مدرس خصوصي لطلاب الطب، تجيب بالعربية الفصحى بأسلوب واضح ومباشر.",
    "أنت مقيّد بالمحتوى العلمي المُقدم فقط. لا تُجب عن أسئلة خارج هذا المحتوى، وإذا سُئلت عن موضوع خارجه فذكّر الطالب بذلك.",
    "استخدم المراجع المُقدمة للإجابة بشكل دقيق ومحدد.",
    "",
    "=== محتوى المحاضرة ===",
    `العنوان: ${title}`,
    "",
    "=== مراجع ذات صلة (استخرج منها الإجابة) ===",
    context,
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
  const premium = await hasAnySubscription(session.user.id);
  if (!lectureRow.module.isFree && !(await hasModuleAccess(session.user.id, lectureRow.module))) {
    return NextResponse.json({ error: "premium required" }, { status: 403 });
  }

  if (!premium) {
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
  }

  try {
    // RAG: Retrieve relevant chunks based on the last user message
    const lastUserMsg = messages[messages.length - 1].content;
    const ragIndex = await getRAGIndex();
    const retrieved = retrieve(ragIndex, lastUserMsg, {
      topK: 6,
      moduleSlug: lectureRow.module.slug,
    });

    const chunks = retrieved.map((r) => ({
      text: r.chunk.text,
      lectureTitle: r.chunk.lectureTitle,
      moduleSlug: r.chunk.moduleSlug,
    }));

    const systemPrompt = buildSystemPrompt(
      lectureRow.title,
      chunks,
      lectureRow.content,
    );

    const { text, inputTokens, outputTokens } = await generateTutorReply({
      system: systemPrompt,
      messages,
    });

    await recordAiUsage({
      userId: session.user.id,
      lectureId,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      inputTokens,
      outputTokens,
    });

    return NextResponse.json({
      reply: text,
      sources: chunks.map((c) => ({
        lectureTitle: c.lectureTitle,
        moduleSlug: c.moduleSlug,
      })),
    });
  } catch (err) {
    console.error("tutor error:", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}
