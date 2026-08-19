import Link from "next/link";
import { requireUser } from "@/shared/session";
import { getCurriculum } from "@/features/curriculum/queries";
import { getCachedCurriculum } from "@/shared/query-cache";
import { ProgressBar } from "@/components/progress-bar";
import { Navigation } from "@/components/navigation";
import { BookOpen, Lock, Unlock, Calendar } from "lucide-react";

function ModuleCard({
  m,
}: {
  m: NonNullable<Awaited<ReturnType<typeof getCurriculum>>>[number];
}) {
  return (
    <li>
      <Link
        href={`/curriculum/${m.slug}`}
        className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold leading-tight group-hover:text-primary">
                {m.name}
              </h2>
            </div>
            {m.description ? (
              <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                {m.description}
              </p>
            ) : null}
          </div>
          {m.isFree ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
              <Unlock className="h-3 w-3" />
              مجاني
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
              <Lock className="h-3 w-3" />
              مدفوع
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar percent={m.percent} />
          <span className="shrink-0 text-xs text-muted-foreground">
            {m.completedLectures}/{m.totalLectures}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default async function CurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const curriculum = await getCachedCurriculum(session.user.id);
  const activeTerm = params.term ? Number(params.term) : 0;

  const term1 = curriculum.filter((m) => m.term === 1);
  const term2 = curriculum.filter((m) => m.term === 2);
  const filtered =
    activeTerm === 1 ? term1 : activeTerm === 2 ? term2 : curriculum;

  const term1Done = term1.reduce((s, m) => s + m.completedLectures, 0);
  const term1Total = term1.reduce((s, m) => s + m.totalLectures, 0);
  const term2Done = term2.reduce((s, m) => s + m.completedLectures, 0);
  const term2Total = term2.reduce((s, m) => s + m.totalLectures, 0);

  return (
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">المنهج</h1>
            <p className="mt-1 text-muted-foreground">
              اختر الترم ثم الموديول لتصفح المحاضرات.
            </p>
          </div>

          {curriculum.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">لا توجد وحدات بعد.</p>
            </div>
          ) : (
            <>
              {/* Term Selector */}
              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                <Link
                  href="/curriculum?term=1"
                  className={`group rounded-2xl border-2 p-5 transition-all hover:shadow-md ${
                    activeTerm === 1
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-border bg-card hover:border-blue-300"
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/50">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">الترم الأول</h3>
                      <p className="text-sm text-muted-foreground">
                        3 موديولات + مادتين
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ProgressBar percent={term1Total > 0 ? Math.round((term1Done / term1Total) * 100) : 0} />
                    <span className="shrink-0 text-xs">
                      {term1Done}/{term1Total}
                    </span>
                  </div>
                </Link>

                <Link
                  href="/curriculum?term=2"
                  className={`group rounded-2xl border-2 p-5 transition-all hover:shadow-md ${
                    activeTerm === 2
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                      : "border-border bg-card hover:border-purple-300"
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/50">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">الترم الثاني</h3>
                      <p className="text-sm text-muted-foreground">
                        4 موديولات + مادة
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ProgressBar percent={term2Total > 0 ? Math.round((term2Done / term2Total) * 100) : 0} />
                    <span className="shrink-0 text-xs">
                      {term2Done}/{term2Total}
                    </span>
                  </div>
                </Link>
              </div>

              {/* Show All / Active Term Label */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {activeTerm === 1
                    ? "الترم الأول"
                    : activeTerm === 2
                      ? "الترم الثاني"
                      : "جميع الموديولات"}
                </h2>
                {activeTerm !== 0 && (
                  <Link
                    href="/curriculum"
                    className="text-sm text-primary hover:underline"
                  >
                    عرض الكل
                  </Link>
                )}
              </div>

              {/* Modules Grid */}
              <ul className="grid gap-4 sm:grid-cols-2">
                {filtered.map((m) => (
                  <ModuleCard key={m.id} m={m} />
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
