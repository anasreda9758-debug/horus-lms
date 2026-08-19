import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { hasModuleAccess } from "@/shared/entitlements";
import { getLectureBySlug } from "@/features/curriculum/queries";
import { TutorChat } from "@/components/tutor-chat";
import { MarkdownContent } from "@/components/markdown-content";
import { Navigation } from "@/components/navigation";
import { Clock, BookOpen, FileText, Lock, MessageCircle, CheckCircle2 } from "lucide-react";
import { CompleteButton } from "@/components/complete-button";
import { PdfViewer } from "@/components/pdf-viewer";
import { db } from "@/shared/db";
import { lectureProgress } from "@/features/curriculum/schema";
import { and, eq } from "drizzle-orm";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireUser();
  const lectureRow = await getLectureBySlug(slug);
  if (!lectureRow) notFound();

  const moduleName = lectureRow.module?.name ?? "الموديول";
  const isFree = lectureRow.module?.isFree ?? true;
  const access = await hasModuleAccess(
    session.user.id,
    lectureRow.module ?? {
      id: "",
      slug: "",
      isFree: true,
      term: 1,
    }
  );

  // Check if lecture is completed
  const progressRow = await db.query.lectureProgress.findFirst({
    where: and(
      eq(lectureProgress.userId, session.user.id),
      eq(lectureProgress.lectureId, lectureRow.id)
    ),
  });
  const isCompleted = !!progressRow;

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
            {lectureRow.module && (
              <>
                <Link
                  href={`/curriculum/${lectureRow.module.slug}`}
                  className="hover:text-foreground"
                >
                  {moduleName}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground">{lectureRow.title}</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{lectureRow.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                {moduleName}
              </span>
              {lectureRow.subject ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {lectureRow.subject}
                </span>
              ) : null}
              {lectureRow.kind ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {lectureRow.kind === "lecture"
                    ? "محاضرة"
                    : lectureRow.kind === "seminar"
                      ? "سيمينار"
                      : "عملي"}
                </span>
              ) : null}
              {lectureRow.durationMin ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {lectureRow.durationMin} دقيقة
                </span>
              ) : null}
              {!isFree ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
                  <Lock className="h-3 w-3" />
                  محتوى مدفوع
                </span>
              ) : null}
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  مكتمل
                </span>
              )}
            </div>
            {access && (
              <div className="mt-4">
                <CompleteButton
                  lectureId={lectureRow.id}
                  moduleSlug={lectureRow.module?.slug ?? ""}
                  completed={isCompleted}
                />
              </div>
            )}
          </div>

          {!access ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/20">
              <Lock className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <h2 className="mb-2 text-xl font-semibold">
                هذه المحاضرة مدفوعة
              </h2>
              <p className="mb-6 text-muted-foreground">
                اشترِ الموديول أو الترم أو السنة لفتح محتوى هذه المحاضرة والمعلم
                الذكي.
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
              {/* PDF Viewer */}
              {lectureRow.pdfFile ? (
                <div className="mb-6 rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold">الملف الأصلي (PDF)</h2>
                  </div>
                  <PdfViewer lectureId={lectureRow.id} title={lectureRow.title} />
                </div>
              ) : null}

              {/* Content */}
              {lectureRow.content ? (
                <div className="mb-6 rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold">المحتوى النصي</h2>
                  </div>
                  <div className="max-h-[50rem] overflow-auto">
                    <MarkdownContent content={lectureRow.content} />
                  </div>
                </div>
              ) : (
                <div className="mb-6 rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold">المحتوى</h2>
                  </div>
                  <p className="leading-relaxed text-muted-foreground">
                    {lectureRow.summary ??
                      "المحتوى الكامل لهذه المحاضرة متاح في الملف الأصلي أعلاه."}
                  </p>
                </div>
              )}

              {/* AI Tutor */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold">المعلم الذكي (AI Tutor)</h2>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  اسأل أي سؤال متعلق بمحتوى هذه المحاضرة فقط. الحد المجاني: 15
                  رسالة يوميًا — وبدون حد للمشتركين.
                </p>
                <TutorChat lectureId={lectureRow.id} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
