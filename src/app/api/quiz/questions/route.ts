import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";
import { startAttempt } from "@/features/practice/queries";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bankSlug = request.nextUrl.searchParams.get("slug");
  const count = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("count") ?? "5", 10), 1), 10);

  // If no slug, return list of all banks grouped by module
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

  // Try matching as bank slug first
  const [bank] = await db.execute(sql`SELECT id FROM question_bank WHERE slug = ${bankSlug}`);

  let questionRows: any[];

  if (bank) {
    // Direct bank match
    questionRows = await db.execute(sql`
      SELECT q.id, q.prompt, q.image_url as "imageUrl",
        (SELECT json_agg(json_build_object('id', qo.id, 'text', qo.text) ORDER BY qo."order")
         FROM question_option qo WHERE qo.question_id = q.id) as options
      FROM question q
      WHERE q.bank_id = ${(bank as any).id}
      ORDER BY RANDOM()
      LIMIT ${count}
    `);
  } else {
    // Try matching as module slug — fetch from ALL banks in that module
    questionRows = await db.execute(sql`
      SELECT q.id, q.prompt, q.image_url as "imageUrl",
        (SELECT json_agg(json_build_object('id', qo.id, 'text', qo.text) ORDER BY qo."order")
         FROM question_option qo WHERE qo.question_id = q.id) as options
      FROM question q
      JOIN question_bank qb ON qb.id = q.bank_id
      JOIN module m ON m.id = qb.module_id
      WHERE m.slug = ${bankSlug}
      ORDER BY RANDOM()
      LIMIT ${count}
    `);
  }

  const questions = (questionRows as any[]).map((r) => ({
    id: r.id,
    prompt: r.prompt,
    imageUrl: r.imageUrl ?? null,
    options: r.options ?? [],
  }));

  let attemptId: string | null = null;
  if (bank && questions.length > 0) {
    const attempt = await startAttempt(session.user.id, (bank as any).id);
    attemptId = attempt?.id ?? null;
  }

  return NextResponse.json({ questions, attemptId });
}
