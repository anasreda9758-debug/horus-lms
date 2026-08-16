import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bankSlug = request.nextUrl.searchParams.get("slug");
  const count = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("count") ?? "5", 10), 1), 10);

  if (!bankSlug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  // Get bank
  const [bank] = await db.execute(sql`
    SELECT id FROM question_bank WHERE slug = ${bankSlug}
  `);
  if (!bank) return NextResponse.json({ error: "bank not found" }, { status: 404 });

  // Get random questions with options
  const rows = await db.execute(sql`
    SELECT q.id, q.prompt,
      (SELECT json_agg(json_build_object('id', qo.id, 'text', qo.text) ORDER BY qo."order")
       FROM question_option qo WHERE qo.question_id = q.id) as options
    FROM question q
    WHERE q.bank_id = ${(bank as any).id}
    ORDER BY RANDOM()
    LIMIT ${count}
  `);

  const questions = (rows as any[]).map((r) => ({
    id: r.id,
    prompt: r.prompt,
    options: r.options ?? [],
  }));

  return NextResponse.json({ questions });
}
