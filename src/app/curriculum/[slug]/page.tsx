import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { hasModuleAccess } from "@/shared/entitlements";
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
  const access = await hasModuleAccess(session.user.id, mod);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <Link href="/curriculum" className={buttonVariants({ variant: "outline", size: "sm" })}>
          العودة للمنهج
        </Link>
        {!mod.isFree ? (
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
            محتوى مدفوع
          </span>
        ) : null}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{mod.name}</h1>
        {mod.description ? (
          <p className="mt-2 text-muted-foreground">{mod.description}</p>
        ) : null}
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            الترم {mod.term}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              mod.isFree
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            {mod.isFree ? "مجاني" : "مدفوع"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ProgressBar percent={mod.percent} />
        <span className="shrink-0 text-sm text-muted-foreground">
          {mod.completedLectures}/{mod.totalLectures} مكتملة
        </span>
      </div>

      {!access ? (
        <div className="rounded-xl bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700">هذا الموديول مدفوع</p>
          <p className="mt-1 text-muted-foreground">
            اشترِ الموديول أو الترم أو السنة بالكامل لفتح المحاضرات والاختبارات
            والمعلم الذكي.
          </p>
          <Link href="/pricing" className={`${buttonVariants({ size: "sm", className: "mt-3" })}`}>
            عرض الأسعار والاشتراك
          </Link>
        </div>
      ) : (
        <>
          {bank ? (
            <Link href={`/quiz/${bank.slug}`} className={buttonVariants({ size: "sm" })}>
              اختبار الموديول
            </Link>
          ) : null}

          {renderGroupedLectures(mod.lectures, mod.slug)}
        </>
      )}
    </main>
  );
}

type LectureRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  subject: string | null;
  kind: string | null;
  durationMin: number | null;
  completed: boolean;
};

const KIND_LABELS: Record<string, string> = {
  lecture: "محاضرات",
  seminar: "سيمينار",
  practical: "عملي",
};

function renderGroupedLectures(lectures: LectureRow[], moduleSlug: string) {
  const groups = new Map<string, Map<string, LectureRow[]>>();
  for (const l of lectures) {
    const subject = l.subject ?? "عام";
    const kind = l.kind ?? "lecture";
    if (!groups.has(subject)) groups.set(subject, new Map());
    const kinds = groups.get(subject)!;
    if (!kinds.has(kind)) kinds.set(kind, []);
    kinds.get(kind)!.push(l);
  }

  const order: Array<[string, Map<string, LectureRow[]>]> = [...groups.entries()];
  if (order.length === 0) {
    return (
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <p className="text-muted-foreground">
          لا توجد محاضرات مفصّلة لهذا الموديول بعد.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {order.map(([subject, kinds]) => (
        <section key={subject}>
          <h2 className="mb-3 text-lg font-semibold">{subject}</h2>
          {[...kinds.entries()].map(([kind, items]) => (
            <div key={kind} className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {KIND_LABELS[kind] ?? kind}
              </p>
              <ul className="grid gap-3">
                {items.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
                  >
                    <div>
                      <h3 className="font-semibold">
                        <Link
                          href={`/lecture/${l.slug}`}
                          className="transition-colors hover:text-primary"
                        >
                          {l.title}
                        </Link>
                        {l.completed ? (
                          <span className="ms-2 text-xs font-medium text-emerald-600">✓ مكتملة</span>
                        ) : null}
                      </h3>
                      {l.durationMin ? (
                        <p className="mt-1 text-xs text-muted-foreground">{l.durationMin} دقيقة</p>
                      ) : null}
                    </div>
                    <CompleteButton
                      lectureId={l.id}
                      moduleSlug={moduleSlug}
                      completed={l.completed}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
