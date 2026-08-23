import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { user } from "@/features/auth/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name } = body;

  if (name && typeof name === "string" && name.trim()) {
    await db.update(user).set({ name: name.trim() }).where(eq(user.id, session.user.id));
  }

  return NextResponse.json({ ok: true });
}
