import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { hasAnySubscription } from "@/features/billing/queries";
import { getAiUsageToday, FREE_DAILY_LIMIT, recordAiUsage } from "@/features/ai/queries";
import { generateJson } from "@/shared/ai-client";
import { getClinicalCase } from "@/features/review/queries";
import { awardXp } from "@/features/gamification/queries";

const SYSTEM_PROMPT =
  "You are a medical examiner. Evaluate the student's answers against the model answers. Give clear, concise feedback " +
  "with strengths, missing points, and an overall score out of 100. Return ONLY valid JSON in this shape: " +
  '{"score": 0, "feedback": "..."}.';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let caseId: string;
  let answers: string[];
  try {
    const body = await request.json();
    if (typeof body.caseId !== "string" || body.caseId.length === 0) {
      return NextResponse.json({ error: "invalid caseId" }, { status: 400 });
    }
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return NextResponse.json({ error: "invalid answers" }, { status: 400 });
    }
    caseId = body.caseId;
    answers = body.answers.map((a: unknown) => String(a ?? ""));
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const caseRow = await getClinicalCase(caseId, session.user.id);
  if (!caseRow) {
    return NextResponse.json({ error: "case not found" }, { status: 404 });
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

  const questions = JSON.parse(caseRow.questionsJson) as string[];
  const modelAnswers = JSON.parse(caseRow.modelAnswersJson) as string[];
  const joined = answers.map((a, i) => `Q${i + 1}: ${a}`).join("\n");

  try {
    const { data, inputTokens, outputTokens } = await generateJson<{ score: number; feedback: string }>({
      system: SYSTEM_PROMPT,
      user: `QUESTIONS:\n${JSON.stringify(questions)}\n\nMODEL ANSWERS:\n${JSON.stringify(modelAnswers)}\n\nSTUDENT:\n${joined}`,
    });
    await recordAiUsage({
      userId: session.user.id,
      lectureId: caseRow.lectureId,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      inputTokens,
      outputTokens,
    });
    awardXp(session.user.id, "case_complete", caseId).catch(() => {});
    return NextResponse.json({
      score: data?.score ?? null,
      feedback: data?.feedback ?? "لم نتمكن من توليد تقييم.",
    });
  } catch (err) {
    console.error("case evaluate error:", err);
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }
}
