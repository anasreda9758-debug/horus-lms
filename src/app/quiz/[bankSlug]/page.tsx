import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { hasModuleAccess } from "@/shared/entitlements";
import { getBankBySlug, getQuizQuestions } from "@/features/practice/queries";
import { QuizRunner } from "@/components/quiz-runner";
import { Navigation } from "@/components/navigation";
import { Lock, HelpCircle } from "lucide-react";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ bankSlug: string }>;
}) {
  const { bankSlug } = await params;
  const session = await requireUser();
  const bank = await getBankBySlug(bankSlug);
  if (!bank) notFound();

  const moduleName = bank.module?.name ?? "هذا الموديول";
  const access = await hasModuleAccess(
    session.user.id,
    bank.module ?? {
      id: "",
      slug: "",
      isFree: true,
      term: 1,
    }
  );

  const questions = await getQuizQuestions(bank.id);

  return (
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            {bank.module && (
              <>
                <Link
                  href={`/curriculum/${bank.module.slug}`}
                  className="hover:text-foreground"
                >
                  {moduleName}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground">{bank.title}</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{bank.title}</h1>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <HelpCircle className="h-3 w-3" />
                {questions.length} سؤالًا
              </span>
              <span className="text-sm text-muted-foreground">{moduleName}</span>
            </div>
          </div>

          {!access ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/20">
              <Lock className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <h2 className="mb-2 text-xl font-semibold">
                هذا الاختبار مدفوع
              </h2>
              <p className="mb-6 text-muted-foreground">
                اشترِ الموديول أو الترم أو السنة لفتح اختبارات هذا الموديول.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                عرض الأسعار والاشتراك
              </Link>
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <HelpCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                لا توجد أسئلة في هذا الاختبار بعد.
              </p>
            </div>
          ) : (
            <QuizRunner bankSlug={bankSlug} moduleSlug={bank.module?.slug ?? ""} questions={questions} />
          )}
        </div>
      </main>
    </div>
  );
}
