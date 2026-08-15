import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { getBankBySlug, gradeAnswer, resolveAttempt } from "@/features/practice/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let bankSlug: string;
  let questionId: string;
  let optionId: string;
  try {
    const body = await request.json();
    if (typeof body.bankSlug !== "string" || body.bankSlug.length === 0) {
      return NextResponse.json({ error: "invalid bankSlug" }, { status: 400 });
    }
    if (typeof body.questionId !== "string" || body.questionId.length === 0) {
      return NextResponse.json({ error: "invalid questionId" }, { status: 400 });
    }
    if (typeof body.optionId !== "string" || body.optionId.length === 0) {
      return NextResponse.json({ error: "invalid optionId" }, { status: 400 });
    }
    bankSlug = body.bankSlug;
    questionId = body.questionId;
    optionId = body.optionId;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const bank = await getBankBySlug(bankSlug);
  if (!bank) {
    return NextResponse.json({ error: "bank not found" }, { status: 400 });
  }

  const attempt = await resolveAttempt(session.user.id, bank.id);
  const result = await gradeAnswer({
    attemptId: attempt.id,
    questionId,
    optionId,
  });
  if (!result) {
    return NextResponse.json({ error: "question or option not found" }, { status: 400 });
  }

  return NextResponse.json({ attemptId: attempt.id, ...result });
}
