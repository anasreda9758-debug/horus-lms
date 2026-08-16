import { requireUser } from "@/shared/session";
import { CaseStudio } from "@/components/case-studio";
import { listLecturesForReview } from "@/features/review/queries";
import { Navigation } from "@/components/navigation";
import { Stethoscope } from "lucide-react";

export default async function CasesPage() {
  const session = await requireUser();
  const lectures = await listLecturesForReview(session.user.id);

  return (
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">الحالات السريرية</h1>
            <p className="mt-1 text-muted-foreground">
              حل حالة سريرية مولّدة من محتوى المحاضرة واحصل على تقييم.
            </p>
          </div>

          {lectures.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Stethoscope className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                لا توجد محاضرات بنص قابل للقراءة بعد — أو اشترك في موديول/ترم لفتح المحتوى.
              </p>
            </div>
          ) : (
            <CaseStudio lectures={lectures} />
          )}
        </div>
      </main>
    </div>
  );
}
