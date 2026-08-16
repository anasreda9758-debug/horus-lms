import Link from "next/link";
import { requireUser } from "@/shared/session";
import { getCurriculum } from "@/features/curriculum/queries";
import { ProgressBar } from "@/components/progress-bar";
import { Navigation } from "@/components/navigation";
import { BookOpen, Lock, Unlock } from "lucide-react";

function ModuleCard({
  m,
}: {
  m: NonNullable<Awaited<ReturnType<typeof getCurriculum>>>[number];
}) {
  const termColors = [
    "from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-900",
    "from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-900",
  ];
  const termColor = termColors[(m.term - 1) % 2];

  return (
    <li>
      <Link
        href={`/curriculum/${m.slug}`}
        className={`group block rounded-2xl border bg-gradient-to-br p-5 transition-all hover:shadow-md ${termColor}`}
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

export default async function CurriculumPage() {
  const session = await requireUser();
  const curriculum = await getCurriculum(session.user.id);

  const term1 = curriculum.filter((m) => m.term === 1);
  const term2 = curriculum.filter((m) => m.term === 2);

  function renderTerm(
    title: string,
    modules: typeof curriculum,
    subtitle: string
  ) {
    if (modules.length === 0) return null;
    return (
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <ModuleCard key={m.id} m={m} />
          ))}
        </ul>
      </section>
    );
  }

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
              تصفح الموديولات والمحاضرات المتاحة.
            </p>
          </div>

          {curriculum.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">لا توجد وحدات بعد.</p>
            </div>
          ) : (
            <div className="grid gap-10">
              {renderTerm("الترم الأول", term1, "التمريض والمعرفة الأساسية")}
              {renderTerm("الترم الثاني", term2, "أنظمة الجسم والتخصصات")}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
