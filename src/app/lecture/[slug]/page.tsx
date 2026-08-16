import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { hasModuleAccess } from "@/shared/entitlements";
import { getLectureBySlug } from "@/features/curriculum/queries";
import { buttonVariants } from "@/components/ui/button";
import { TutorChat } from "@/components/tutor-chat";

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
  const access = await hasModuleAccess(session.user.id, lectureRow.module ?? {
    id: "",
    slug: "",
    isFree: true,
    term: 1,
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <Link
          href={lectureRow.module ? `/curriculum/${lectureRow.module.slug}` : "/curriculum"}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          العودة للموديول
        </Link>
        {!isFree ? (
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
            محتوى مدفوع
          </span>
        ) : null}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{lectureRow.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground">{moduleName}</p>
          {lectureRow.subject ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {lectureRow.subject}
            </span>
          ) : null}
          {lectureRow.kind ? (
            <span className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {lectureRow.kind === "lecture" ? "محاضرة" : lectureRow.kind === "seminar" ? "سيمينار" : "عملي"}
            </span>
          ) : null}
          {lectureRow.durationMin ? (
            <p className="text-xs text-muted-foreground">{lectureRow.durationMin} دقيقة</p>
          ) : null}
        </div>
      </div>

      {!access ? (
        <div className="rounded-xl bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700">هذه المحاضرة مدفوعة</p>
          <p className="mt-1 text-muted-foreground">
            اشترِ الموديول أو الترم أو السنة لفتح محتوى هذه المحاضرة والمعلم الذكي.
          </p>
          <Link href="/pricing" className={`${buttonVariants({ size: "sm", className: "mt-3" })}`}>
            عرض الأسعار والاشتراك
          </Link>
        </div>
      ) : (
        <>
          {lectureRow.pdfFile ? (
            <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <h2 className="mb-3 text-lg font-semibold">الملف الأصلي (PDF)</h2>
              <iframe
                src={`/api/content/pdf/${lectureRow.id}`}
                className="h-[70vh] w-full rounded-lg border-0 bg-muted"
                title={`PDF: ${lectureRow.title}`}
              />
            </div>
          ) : null}

          {lectureRow.content ? (
            <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <h2 className="mb-2 text-lg font-semibold">المحتوى النصي</h2>
              <pre className="max-h-[40rem] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                {lectureRow.content}
              </pre>
            </div>
          ) : (
            <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
              <h2 className="mb-2 text-lg font-semibold">المحتوى</h2>
              <p className="leading-relaxed text-muted-foreground">
                {lectureRow.summary ??
                  "المحتوى الكامل لهذه المحاضرة متاح في الملف الأصلي أعلاه."}
              </p>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-lg font-semibold">المعلم الذكي (AI Tutor)</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              اسأل أي سؤال متعلق بمحتوى هذه المحاضرة فقط. الحد المجاني: 15 رسالة
              يوميًا — وبدون حد للمشتركين.
            </p>
            <TutorChat lectureId={lectureRow.id} />
          </div>
        </>
      )}
    </main>
  );
}
