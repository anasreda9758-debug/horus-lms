import Link from "next/link";
import { requireUser } from "@/shared/session";
import { buttonVariants } from "@/components/ui/button";
import { CaseStudio } from "@/components/case-studio";
import { listLecturesForReview } from "@/features/review/queries";

export default async function CasesPage() {
  const session = await requireUser();
  const lectures = await listLecturesForReview(session.user.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🩺 الحالات السريرية</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            حل حالة سريرية مولّدة من محتوى المحاضرة واحصل على تقييم.
          </p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          لوحة الطالب
        </Link>
      </div>

      {lectures.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center text-muted-foreground ring-1 ring-foreground/10">
          لا توجد محاضرات بنص قابل للقراءة بعد — أو اشترك في موديول/ترم لفتح المحتوى.
        </div>
      ) : (
        <CaseStudio lectures={lectures} />
      )}
    </main>
  );
}
