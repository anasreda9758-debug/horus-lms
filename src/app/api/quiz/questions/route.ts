import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bankSlug = request.nextUrl.searchParams.get("slug");
  const count = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("count") ?? "5", 10), 1), 10);

  // If no slug, return list of all banks
  if (!bankSlug) {
    const banks = await db.execute(sql`
      SELECT qb.slug, qb.title, m.name as module_name, m.slug as module_slug,
        (SELECT count(*) FROM question q WHERE q.bank_id = qb.id) as question_count
      FROM question_bank qb
      JOIN module m ON m.id = qb.module_id
      ORDER BY m."order", qb.title
    `);
    return NextResponse.json({
      banks: (banks as any[]).map((b) => ({
        slug: b.slug,
        title: b.title,
        moduleName: b.module_name,
        moduleSlug: b.module_slug,
        questionCount: Number(b.question_count),
      })),
    });
  }

  // Get questions from specific bank
  const [bank] = await db.execute(sql`
    SELECT id FROM question_bank WHERE slug = ${bankSlug}
  `);
  if (!bank) return NextResponse.json({ error: "bank not found" }, { status: 404 });

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
