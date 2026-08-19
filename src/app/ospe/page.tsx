import { requireUser } from "@/shared/session";
import { OspeSimulator } from "@/components/ospe-simulator";
import { ExamMode } from "@/components/exam-mode";
import { Navigation } from "@/components/navigation";

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
        <div className="mx-auto max-w-4xl">
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
        </div>
      </main>
    </div>
  );
}
