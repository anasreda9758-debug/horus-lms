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
  const access = await hasModuleAccess(session.user.id, isFree);

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
            محتوى بريميوم
          </span>
        ) : null}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{lectureRow.title}</h1>
        <p className="mt-2 text-muted-foreground">{moduleName}</p>
        {lectureRow.durationMin ? (
          <p className="mt-1 text-xs text-muted-foreground">{lectureRow.durationMin} دقيقة</p>
        ) : null}
      </div>

      {!access ? (
        <div className="rounded-xl bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700">هذه المحاضرة بريميوم</p>
          <p className="mt-1 text-muted-foreground">
            فعّل اشتراكك (يدويًا من فريق الدعم حاليًا) لفتح محتوى هذه المحاضرة
            والمعلم الذكي غير المحدود.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <h2 className="mb-2 text-lg font-semibold">المحتوى</h2>
            <p className="leading-relaxed text-muted-foreground">
              {lectureRow.summary ?? "المحتوى الكامل لهذه المحاضرة قيد الإعداد."}
            </p>
          </div>

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
