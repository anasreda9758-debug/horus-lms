import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { hasModuleAccess } from "@/shared/entitlements";
import { getBankBySlug, getQuizQuestions } from "@/features/practice/queries";
import { buttonVariants } from "@/components/ui/button";
import { QuizRunner } from "@/components/quiz-runner";

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
  const isFree = bank.module?.isFree ?? true;
  const access = await hasModuleAccess(session.user.id, isFree);

  const questions = await getQuizQuestions(bank.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <Link
          href={bank.module ? `/curriculum/${bank.module.slug}` : "/curriculum"}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          العودة
        </Link>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {questions.length} سؤالًا
        </span>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{bank.title}</h1>
        <p className="mt-2 text-muted-foreground">{moduleName}</p>
      </div>

      {!access ? (
        <div className="rounded-xl bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700">هذا الاختبار بريميوم</p>
          <p className="mt-1 text-muted-foreground">
            فعّل اشتراكك (يدويًا من فريق الدعم حاليًا) لفتح اختبارات هذا الموديول.
          </p>
        </div>
      ) : questions.length === 0 ? (
        <p className="text-muted-foreground">لا توجد أسئلة في هذا الاختبار بعد.</p>
      ) : (
        <QuizRunner bankSlug={bankSlug} questions={questions} />
      )}
    </main>
  );
}
