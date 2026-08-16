import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { reviewFlashcard } from "@/features/review/queries";
import { awardXp } from "@/features/gamification/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let cardId: string;
  let rating: "again" | "good" | "easy";
  try {
    const body = await request.json();
    if (typeof body.cardId !== "string" || body.cardId.length === 0) {
      return NextResponse.json({ error: "invalid cardId" }, { status: 400 });
    }
    if (!["again", "good", "easy"].includes(body.rating)) {
      return NextResponse.json({ error: "invalid rating" }, { status: 400 });
    }
    cardId = body.cardId;
    rating = body.rating;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  await reviewFlashcard(cardId, session.user.id, rating);
  awardXp(session.user.id, "flashcard_review", cardId).catch(() => {});
  return NextResponse.json({ ok: true });
}
