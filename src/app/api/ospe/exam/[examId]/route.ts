import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { getExam, submitStationAnswer, finishExam } from "@/features/ospe/exam";

/**
 * GET /api/ospe/exam/[examId]
 * Get exam details with all stations.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { examId } = await params;
  const exam = await getExam(examId, session.user.id);
  if (!exam) {
    return NextResponse.json({ error: "exam not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, exam });
}

/**
 * POST /api/ospe/exam/[examId]
 * Submit an answer for a station or finish the exam.
 * Body: { action: "answer" | "finish", stationId?: string, answer?: string, timeSpentSec?: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { examId } = await params;
  let body: {
    action: "answer" | "finish";
    stationId?: string;
    answer?: string;
    timeSpentSec?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    if (body.action === "answer") {
      if (!body.stationId || body.answer === undefined) {
        return NextResponse.json({ error: "stationId and answer required" }, { status: 400 });
      }
      const result = await submitStationAnswer({
        examId,
        stationId: body.stationId,
        userId: session.user.id,
        studentAnswer: body.answer,
        timeSpentSec: body.timeSpentSec ?? 0,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "finish") {
      const result = await finishExam(examId, session.user.id);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 400 },
    );
  }
}
