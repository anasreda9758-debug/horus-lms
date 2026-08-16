import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { stat } from "node:fs/promises";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { resolveContentFile } from "@/shared/content";
import { lecture } from "@/features/curriculum/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lectureId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { lectureId } = await params;
  const row = await db.query.lecture.findFirst({
    where: eq(lecture.id, lectureId),
    with: { module: true },
  });
  if (!row || !row.module) {
    return NextResponse.json({ error: "lecture not found" }, { status: 404 });
  }

  if (!row.module.isFree) {
    const { hasModuleAccess } = await import("@/features/billing/queries");
    if (!(await hasModuleAccess(session.user.id, row.module))) {
      return NextResponse.json({ error: "premium required" }, { status: 403 });
    }
  }

  if (!row.pdfFile) {
    return NextResponse.json({ error: "no pdf on file for this lecture" }, { status: 404 });
  }

  const resolved = resolveContentFile(row.pdfFile);
  if (!resolved) {
    return NextResponse.json({ error: "invalid file path" }, { status: 400 });
  }

  try {
    const info = await stat(resolved);
    if (!info.isFile()) {
      return NextResponse.json({ error: "file not found" }, { status: 404 });
    }
    const contentLength = info.size;
    return streamPdf(resolved, contentLength);
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}

async function streamPdf(resolved: string, contentLength: number) {
  const { createReadStream } = await import("node:fs");
  const stream = createReadStream(resolved);
  const body = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(contentLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
