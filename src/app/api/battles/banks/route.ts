import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/shared/db";

// Battle setup only needs bank metadata. Keeping this small read endpoint
// independent from quiz-attempt authentication prevents an empty selector when
// the challenge page loads before the session-dependent quiz endpoint.
export async function GET() {
  const rows = await db.execute(sql`
    SELECT qb.slug, qb.title, m.name AS module_name, m.slug AS module_slug,
      COUNT(q.id)::int AS question_count
    FROM question_bank qb
    JOIN module m ON m.id = qb.module_id
    JOIN question q ON q.bank_id = qb.id
    GROUP BY qb.id, qb.slug, qb.title, m.name, m.slug, m."order"
    ORDER BY m."order", qb.title
  `);
  return NextResponse.json({
    banks: (rows as unknown as Array<{
      slug: string; title: string; module_name: string; module_slug: string; question_count: number;
    }>).map((row) => ({
      slug: row.slug,
      title: row.title,
      moduleName: row.module_name,
      moduleSlug: row.module_slug,
      questionCount: Number(row.question_count),
    })),
  });
}
