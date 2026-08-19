import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { createExam, getExam, startExam } from "@/features/ospe/exam";

/**
 * POST /api/ospe/exam
 * Create and start an exam session.
 * Body: { folder?: string, stationCount?: number, timePerStationSec?: number, totalTimeLimitSec?: number }
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    folder?: string;
    stationCount?: number;
    timePerStationSec?: number;
    totalTimeLimitSec?: number;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const stationCount = Math.min(Math.max(body.stationCount ?? 10, 1), 30);
  const timePerStationSec = Math.min(Math.max(body.timePerStationSec ?? 60, 15), 300);
  const totalTimeLimitSec = Math.min(Math.max(body.totalTimeLimitSec ?? stationCount * timePerStationSec, 60), 3600);

  try {
    const examId = await createExam({
      userId: session.user.id,
      folder: body.folder,
      stationCount,
      timePerStationSec,
      totalTimeLimitSec,
    });

    const result = await startExam(examId);

    // Fetch full exam with stations for the client
    const fullExam = await getExam(examId, session.user.id);
    if (!fullExam) {
      return NextResponse.json({ error: "exam created but could not be loaded" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      examId,
      stationCount: fullExam.stations.length,
      totalTimeLimitSec: fullExam.totalTimeLimitSec,
      timePerStationSec: fullExam.timePerStationSec,
      status: fullExam.status,
      stations: fullExam.stations.map((s) => ({
        id: s.id,
        order: s.order,
        folder: s.folder,
        fileName: s.fileName,
        studentAnswer: s.studentAnswer,
        score: s.score,
        timeSpentSec: s.timeSpentSec,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create exam" },
      { status: 400 },
    );
  }
}
