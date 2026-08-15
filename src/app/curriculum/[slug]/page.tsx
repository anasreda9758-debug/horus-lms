import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { getModuleBySlug } from "@/features/curriculum/queries";
import { getBankForModule } from "@/features/practice/queries";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { CompleteButton } from "@/components/complete-button";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireUser();
  const mod = await getModuleBySlug(session.user.id, slug);
  if (!mod) notFound();
  const bank = await getBankForModule(mod.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <Link href="/curriculum" className={buttonVariants({ variant: "outline", size: "sm" })}>
          العودة للمنهج
        </Link>
        {!mod.isFree ? (
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
            محتوى بريميوم
          </span>
        ) : null}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{mod.name}</h1>
        {mod.description ? (
          <p className="mt-2 text-muted-foreground">{mod.description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <ProgressBar percent={mod.percent} />
        <span className="shrink-0 text-sm text-muted-foreground">
          {mod.completedLectures}/{mod.totalLectures} مكتملة
        </span>
      </div>

      {!mod.isFree ? (
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          هذا الموديول بريميوم. سيُفتح تلقائيًا عند تفعيل اشتراكك (التفعيل اليدوي
          يبدأ في المرحلة القادمة).
        </p>
      ) : null}

      {mod.isFree && bank ? (
        <Link href={`/quiz/${bank.slug}`} className={buttonVariants({ size: "sm" })}>
          اختبار الموديول
        </Link>
      ) : null}

      <ul className="grid gap-3">
        {mod.lectures.map((l) => (
          <li
            key={l.id}
            className="flex items-center justify-between gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
          >
            <div>
              <h2 className="font-semibold">
                <Link
                  href={`/lecture/${l.slug}`}
                  className="transition-colors hover:text-primary"
                >
                  {l.title}
                </Link>
                {l.completed ? (
                  <span className="ms-2 text-xs font-medium text-emerald-600">✓ مكتملة</span>
                ) : null}
              </h2>
              {l.summary ? (
                <p className="mt-1 text-sm text-muted-foreground">{l.summary}</p>
              ) : null}
              {l.durationMin ? (
                <p className="mt-1 text-xs text-muted-foreground">{l.durationMin} دقيقة</p>
              ) : null}
            </div>
            <CompleteButton lectureId={l.id} moduleSlug={mod.slug} completed={l.completed} />
          </li>
        ))}
      </ul>
    </main>
  );
}
