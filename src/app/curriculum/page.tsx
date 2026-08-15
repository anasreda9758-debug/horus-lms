import Link from "next/link";
import { requireUser } from "@/shared/session";
import { getCurriculum } from "@/features/curriculum/queries";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";

export default async function CurriculumPage() {
  const session = await requireUser();
  const curriculum = await getCurriculum(session.user.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">المنهج</h1>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          لوحة الطالب
        </Link>
      </div>

      {curriculum.length === 0 ? (
        <p className="text-muted-foreground">لا توجد وحدات بعد.</p>
      ) : (
        <ul className="grid gap-4">
          {curriculum.map((m) => (
            <li key={m.id}>
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
          ))}
        </ul>
      )}
    </main>
  );
}
