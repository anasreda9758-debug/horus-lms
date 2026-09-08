import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";

// Purchase flow for the pricing page.
//
// Payments are intentionally disabled until the production payment workflow is
// explicitly reviewed. This endpoint must never grant an entitlement by itself.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let planId: string;
  try {
    const body = await request.json();
    if (typeof body.planId !== "string" || body.planId.length === 0) {
      return NextResponse.json({ error: "invalid planId" }, { status: 400 });
    }
    planId = body.planId;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  void planId;
  return NextResponse.json({ error: "payments are not active" }, { status: 503 });
}
