import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { lecture, lectureProgress } from "./schema";

export async function getLectureBySlug(slug: string) {
  return db.query.lecture.findFirst({
    where: eq(lecture.slug, slug),
    with: { module: true },
  });
}

export async function getCurriculum(userId: string) {
  const modules = await db.query.curriculumModule.findMany({
    orderBy: (m, { asc }) => [asc(m.order)],
    with: {
      lectures: {
        orderBy: (l, { asc }) => [asc(l.order)],
      },
    },
  });

  const done = await db
    .select({ lectureId: lectureProgress.lectureId })
    .from(lectureProgress)
    .where(eq(lectureProgress.userId, userId));
  const doneSet = new Set(done.map((r) => r.lectureId));

  return modules.map((m) => {
    const total = m.lectures.length;
    const completed = m.lectures.filter((l) => doneSet.has(l.id)).length;
    return {
      ...m,
      totalLectures: total,
      completedLectures: completed,
      percent: total ? Math.round((completed / total) * 100) : 0,
      lectures: m.lectures.map((l) => ({ ...l, completed: doneSet.has(l.id) })),
    };
  });
}

export async function getModuleBySlug(userId: string, slug: string) {
  const curriculum = await getCurriculum(userId);
  return curriculum.find((m) => m.slug === slug) ?? null;
}

export async function getOverallProgress(userId: string) {
  const curriculum = await getCurriculum(userId);
  const { withModuleAccess } = await import("@/features/billing/queries");
  const accessible = (await withModuleAccess(userId, curriculum)).filter((m) => m.access);
  const total = accessible.reduce((sum, m) => sum + m.totalLectures, 0);
  const completed = accessible.reduce((sum, m) => sum + m.completedLectures, 0);
  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}
