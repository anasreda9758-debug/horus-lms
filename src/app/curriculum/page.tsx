import Link from "next/link";
import { requireUser } from "@/shared/session";
import { getCurriculum } from "@/features/curriculum/queries";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";

function ModuleCard({ m }: { m: NonNullable<Awaited<ReturnType<typeof getCurriculum>>>[number] }) {
  return (
    <li>
      <Link
        href={`/curriculum/${m.slug}`}
        className="block rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{m.name}</h2>
            {m.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
            ) : null}
          </div>
          {m.isFree ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              مجاني
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
              بريميوم — افتح الآن
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
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

  function renderTerm(title: string, modules: typeof curriculum, subtitle: string) {
    if (modules.length === 0) return null;
    return (
      <section>
        <div className="mb-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <ul className="grid gap-4">
          {modules.map((m) => (
            <ModuleCard key={m.id} m={m} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">المنهج</h1>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          لوحة الطالب
        </Link>
      </div>

      {curriculum.length === 0 ? (
        <p className="text-muted-foreground">لا توجد وحدات بعد.</p>
      ) : (
        <div className="grid gap-8">
          {renderTerm("الترم الأول", term1, "محاضرات مجانية")}
          {renderTerm("الترم الثاني", term2, "محتوى بريميوم")}
        </div>
      )}
    </main>
  );
}
