import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { getBankBySlug, getQuizQuestions } from "@/features/practice/queries";
import { buttonVariants } from "@/components/ui/button";
import { QuizRunner } from "@/components/quiz-runner";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ bankSlug: string }>;
}) {
  const { bankSlug } = await params;
  await requireUser();
  const bank = await getBankBySlug(bankSlug);
  if (!bank) notFound();

  const moduleName = bank.module?.name ?? "هذا الموديول";
  const isFree = bank.module?.isFree ?? true;

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

      {!isFree ? (
        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          هذا الاختبار بريميوم. سيُفتح تلقائيًا عند تفعيل اشتراكك (التفعيل اليدوي
          يبدأ في المرحلة القادمة).
        </p>
      ) : questions.length === 0 ? (
        <p className="text-muted-foreground">لا توجد أسئلة في هذا الاختبار بعد.</p>
      ) : (
        <QuizRunner bankSlug={bankSlug} questions={questions} />
      )}
    </main>
  );
}
