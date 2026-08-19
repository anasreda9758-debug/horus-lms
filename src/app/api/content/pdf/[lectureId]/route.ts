import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { lecture } from "@/features/curriculum/schema";
import { streamFile } from "@/shared/storage";

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

  const response = await streamFile(row.pdfFile);
  if (!response) {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }

  return response;
}
