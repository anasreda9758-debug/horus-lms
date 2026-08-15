import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/shared/session";
import { finishAttempt } from "@/features/practice/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let attemptId: string;
  try {
    const body = await request.json();
    if (typeof body.attemptId !== "string" || body.attemptId.length === 0) {
      return NextResponse.json({ error: "invalid attemptId" }, { status: 400 });
    }
    attemptId = body.attemptId;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const result = await finishAttempt(session.user.id, attemptId);
  if (!result) {
    return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  }

  revalidatePath("/dashboard");
  return NextResponse.json(result);
}
