import { requireUser } from "@/shared/session";
import { OspeSimulator } from "@/components/ospe-simulator";
import { ExamMode } from "@/components/exam-mode";
import { Navigation } from "@/components/navigation";
import { ExternalLink, FileText, ClipboardList } from "lucide-react";

const OSPE_EXAM_LINKS = [
  {
    module: "CVS",
    title: "فورم مراجعة OSPE — CVS",
    url: "https://forms.cloud.microsoft/r/zS6PhM5nNU",
  },
  {
    module: "Resp — Anatomy & Histology",
    title: "فورم مراجعة Resp — Anatomy & Histology",
    url: "https://forms.cloud.microsoft/r/i9k3Ry7WYE",
  },
  {
    module: "Resp — Patho, Micro & Physio",
    title: "فورم مراجعة Resp — Patho, Micro & Physio",
    url: "https://forms.office.com/r/KpkDPN1dgn",
  },
  {
    module: "Resp — Patho, Micro & Physio (2)",
    title: "فورم مراجعة Resp — Patho, Micro & Physio",
    url: "https://forms.cloud.microsoft/r/YNMrjRj9Ar",
  },
  {
    module: "RENAL — Anatomy",
    title: "فورم مراجعة RENAL Anatomy (110 سؤال)",
    url: "https://forms.office.com/r/9pHRDUJyi3",
  },
  {
    module: "RENAL — شامل",
    title: "فورم مراجعة RENAL شاملة",
    url: "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=p-bjc0VHYU-qSBFD8XCxuhzBZOJxqiNNlQAgkYSzRNFUMVNRRjU1M1RTUUpUS01KNE5QV1E5RUdDWC4u",
  },
];

const OSPE_PDFS = [
  { name: "OSPE CVS", file: "OSPE CVS.pdf", size: "80 MB" },
  { name: "OSPE IBL", file: "OSPE IBL.pdf", size: "18 MB" },
  { name: "Module 1 — Sites & Stains", file: "Ospe module 1 ?? sites & stains.pdf", size: "4.3 MB" },
  { name: "Module 2 — EB", file: "Ospe module 2 EB.pdf", size: "2.7 MB" },
  { name: "Module 3", file: "Ospe module 3.pdf", size: "12 MB" },
  { name: "OSPE RENAL (1)", file: "OSPE RENAL.pdf", size: "43 MB" },
  { name: "OSPE RENAL (2)", file: "OSPE RENAL.pdf-1.pdf", size: "27 MB" },
];

export default async function OspePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const session = await requireUser();
  const { mode } = await searchParams;
  const isExamMode = mode === "exam";

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
                {isExamMode ? "امتحان OSPE" : "محاكي OSPE"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {isExamMode
                  ? "امتحان صارم — وقت محدد، لا تراجع، تقييم تلقائي."
                  : "مراجعة عشوائية للمحطات العملية من معارض الصور."}
              </p>
            </div>
            <a
              href={isExamMode ? "/ospe" : "/ospe?mode=exam"}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isExamMode ? "وضع المراجعة" : "وضع الامتحان"}
            </a>
          </div>

          {isExamMode ? <ExamMode /> : <OspeSimulator />}

          {/* External Exam Links Section */}
          <div className="mt-8 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold">مصادر خارجية — فورم مراجعة OSPE</h2>
              <span className="ml-2 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                خارجي
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              فورمز Microsoft Forms من مصادر طلابية للتدريب على أسئلة OSPE. هذه الفورمز ليست جزءاً من المنصة وقد تتغير أو تُحذف في أي وقت.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {OSPE_EXAM_LINKS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{link.module}</div>
                    <div className="text-xs text-muted-foreground truncate">{link.title}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* PDF References Section */}
          <div className="mt-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">ملفات PDF للمرجع</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              ملفات PDF فيها كل المحطات مع الإجابات النموذجية.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {OSPE_PDFS.map((pdf) => (
                <a
                  key={pdf.file}
                  href={`/ospe-pdfs/${encodeURIComponent(pdf.file)}`}
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
          </div>
        </div>
      </main>
    </div>
  );
}
