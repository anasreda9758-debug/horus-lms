import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { hasModuleAccess } from "@/shared/entitlements";
import { getModuleBySlug } from "@/features/curriculum/queries";
import { getBankForModule } from "@/features/practice/queries";
import { ProgressBar } from "@/components/progress-bar";
import { CompleteButton } from "@/components/complete-button";
import { Navigation } from "@/components/navigation";
import {
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  Lock,
  FlaskConical,
} from "lucide-react";

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
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/curriculum" className="hover:text-foreground">
              المنهج
            </Link>
            <span>/</span>
            <span className="text-foreground">{mod.name}</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{mod.name}</h1>
                {mod.description ? (
                  <p className="mt-2 text-muted-foreground">{mod.description}</p>
                ) : null}
              </div>
              {!mod.isFree ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
                  <Lock className="h-3 w-3" />
                  مدفوع
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                  مجاني
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar percent={mod.percent} />
              <span className="shrink-0 text-sm text-muted-foreground">
                {mod.completedLectures}/{mod.totalLectures} مكتملة
              </span>
            </div>
          </div>

          {!access ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/20">
              <Lock className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <h2 className="mb-2 text-xl font-semibold">
                هذا الموديول مدفوع
              </h2>
              <p className="mb-6 text-muted-foreground">
                اشترِ الموديول أو الترم أو السنة بالكامل لفتح المحاضرات
                والاختبارات والمعلم الذكي.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                عرض الأسعار والاشتراك
              </Link>
            </div>
          ) : (
            <>
              {/* Quiz Button */}
              {bank ? (
                <Link
                  href={`/quiz/${bank.slug}`}
                  className="mb-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <FlaskConical className="h-4 w-4" />
                  اختبار الموديول ({bank.title})
                </Link>
              ) : null}

              {/* Lectures */}
              {renderGroupedLectures(mod.lectures, mod.slug)}
            </>
          )}
        </div>
      </main>
    </div>
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

const KIND_ICONS: Record<string, typeof BookOpen> = {
  lecture: BookOpen,
  seminar: FileText,
  practical: FlaskConical,
};

function renderGroupedLectures(
  lectures: LectureRow[],
  moduleSlug: string
) {
  const groups = new Map<string, Map<string, LectureRow[]>>();
  for (const l of lectures) {
    const subject = l.subject ?? "عام";
    const kind = l.kind ?? "lecture";
    if (!groups.has(subject)) groups.set(subject, new Map());
    const kinds = groups.get(subject)!;
    if (!kinds.has(kind)) kinds.set(kind, []);
    kinds.get(kind)!.push(l);
  }

  const order: Array<[string, Map<string, LectureRow[]>]> = [
    ...groups.entries(),
  ];
  if (order.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">
          لا توجد محاضرات مفصّلة لهذا الموديول بعد.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {order.map(([subject, kinds]) => (
        <section key={subject}>
          <h2 className="mb-4 text-lg font-semibold">{subject}</h2>
          {[...kinds.entries()].map(([kind, items]) => {
            const KindIcon = KIND_ICONS[kind] ?? BookOpen;
            return (
              <div key={kind} className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <KindIcon className="h-3.5 w-3.5" />
                  {KIND_LABELS[kind] ?? kind}
                </div>
                <ul className="space-y-2">
                  {items.map((l) => (
                    <li
                      key={l.id}
                      className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                            l.completed
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {l.completed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <BookOpen className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">
                            <Link
                              href={`/lecture/${l.slug}`}
                              className="transition-colors hover:text-primary"
                            >
                              {l.title}
                            </Link>
                          </h3>
                          {l.durationMin ? (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {l.durationMin} دقيقة
                            </p>
                          ) : null}
                        </div>
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
            );
          })}
        </section>
      ))}
    </div>
  );
}
