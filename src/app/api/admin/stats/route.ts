import { NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const userCount = (await db.execute(sql`SELECT count(*)::int as count FROM "user"`)) as unknown as Row[];
  const studentCount = (await db.execute(sql`SELECT count(*)::int as count FROM "user" WHERE role = 'student'`)) as unknown as Row[];
  const moduleCount = (await db.execute(sql`SELECT count(*)::int as count FROM module`)) as unknown as Row[];
  const lectureCount = (await db.execute(sql`SELECT count(*)::int as count FROM lecture`)) as unknown as Row[];
  const attemptCount = (await db.execute(sql`SELECT count(*)::int as count FROM quiz_attempt WHERE status = 'completed'`)) as unknown as Row[];
  const answerCount = (await db.execute(sql`SELECT count(*)::int as count FROM quiz_answer`)) as unknown as Row[];
  const correctCount = (await db.execute(sql`SELECT count(*)::int as count FROM quiz_answer WHERE is_correct = true`)) as unknown as Row[];
  const activeSubCount = (await db.execute(sql`SELECT count(*)::int as count FROM subscription WHERE status = 'active' AND expires_at > now()`)) as unknown as Row[];
  const recentAttempts = (await db.execute(sql`SELECT count(*)::int as count FROM quiz_attempt WHERE status = 'completed' AND completed_at > now() - interval '7 days'`)) as unknown as Row[];

  const topModules = (await db.execute(sql`
    SELECT m.name, m.slug, count(qa.id)::int as attempts
    FROM quiz_attempt qa
    JOIN question_bank qb ON qb.id = qa.bank_id
    JOIN module m ON m.id = qb.module_id
    WHERE qa.status = 'completed'
    GROUP BY m.id, m.name, m.slug
    ORDER BY attempts DESC
    LIMIT 5
  `)) as unknown as Row[];

  const topUsers = (await db.execute(sql`
    SELECT u.name, u.email, count(qa.id)::int as quizzes,
           sum(qa.score)::int as total_correct, sum(qa.total)::int as total_answered
    FROM quiz_attempt qa
    JOIN "user" u ON u.id = qa.user_id
    WHERE qa.status = 'completed'
    GROUP BY u.id, u.name, u.email
    ORDER BY quizzes DESC
    LIMIT 10
  `)) as unknown as Row[];

  return NextResponse.json({
    users: { total: userCount[0]?.count ?? 0, students: studentCount[0]?.count ?? 0 },
    content: { modules: moduleCount[0]?.count ?? 0, lectures: lectureCount[0]?.count ?? 0 },
    quizzes: {
      attempts: attemptCount[0]?.count ?? 0,
      answers: answerCount[0]?.count ?? 0,
      correct: correctCount[0]?.count ?? 0,
    },
    subscriptions: { active: activeSubCount[0]?.count ?? 0 },
    recentActivity: { last7Days: recentAttempts[0]?.count ?? 0 },
    topModules: topModules.map((m) => ({ name: m.name, slug: m.slug, attempts: m.attempts })),
    topUsers: topUsers.map((u) => ({
      name: u.name,
      email: u.email,
      quizzes: u.quizzes,
      accuracy: u.total_answered > 0 ? Math.round((u.total_correct / u.total_answered) * 100) : 0,
    })),
  });
}
