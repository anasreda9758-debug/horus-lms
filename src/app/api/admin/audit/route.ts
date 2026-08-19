import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { getAuditLogs } from "@/features/hierarchy/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "50"), 200);
  const logs = await getAuditLogs({ limit });

  return NextResponse.json({ logs });
}
