import { requireUser } from "@/shared/session";
import { OspeSimulator } from "@/components/ospe-simulator";
import { ExamMode } from "@/components/exam-mode";
import { Navigation } from "@/components/navigation";
import { FileText } from "lucide-react";
import { getLocale, localize } from "@/shared/locale";
import { getAccessibleOspeFolder } from "@/features/access/learning-access";
import { OSPE_PDF_REFERENCES } from "@/features/ospe/data";

export default async function OspePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await requireUser();
  const locale = await getLocale();
  const { mode } = await searchParams;
  const isExamMode = mode === "exam";
  const accessiblePdfReferences = (
    await Promise.all(
      OSPE_PDF_REFERENCES.map(async (reference) => ({
        reference,
        access: await getAccessibleOspeFolder(session.user, reference.folder),
      })),
    )
  )
    .filter(({ access }) => access.ok)
    .map(({ reference }) => reference);

  return (
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {isExamMode ? localize(locale, "OSPE exam", "امتحان OSPE") : localize(locale, "OSPE simulator", "محاكي OSPE")}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {isExamMode
                  ? localize(locale, "A focused exam with a time limit, no review, and automatic scoring.", "امتحان صارم — وقت محدد، لا تراجع، تقييم تلقائي.")
                  : localize(locale, "Random review of practical stations from the image galleries.", "مراجعة عشوائية للمحطات العملية من معارض الصور.")}
              </p>
            </div>
            <a
              href={isExamMode ? "/ospe" : "/ospe?mode=exam"}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isExamMode ? localize(locale, "Review mode", "وضع المراجعة") : localize(locale, "Exam mode", "وضع الامتحان")}
            </a>
          </div>

          {isExamMode ? <ExamMode /> : <OspeSimulator />}

          {/* PDF References Section */}
          <div className="mt-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{localize(locale, "Reference PDFs", "ملفات PDF للمرجع")}</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {localize(locale, "Reference PDFs available through your current module access.", "ملفات PDF المرجعية المتاحة حسب صلاحية الموديولات الحالية.")}
            </p>
            {accessiblePdfReferences.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {localize(locale, "No OSPE reference PDFs are available with your current access.", "لا توجد ملفات OSPE مرجعية متاحة بصلاحية حسابك الحالية.")}
              </p>
            ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accessiblePdfReferences.map((pdf) => (
                <a
                  key={pdf.file}
                  href={`/api/content/ospe/pdf?file=${encodeURIComponent(pdf.file)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{pdf.name}</div>
                    <div className="text-xs text-muted-foreground">{pdf.size}</div>
                  </div>
                </a>
              ))}
            </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
