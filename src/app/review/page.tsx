import Link from "next/link";
import { requireUser } from "@/shared/session";
import { db } from "@/shared/db";
import { questionReview, question, questionOption, questionBank, quizAnswer, quizAttempt } from "@/features/practice/schema";
import { curriculumModule } from "@/features/curriculum/schema";
import { and, eq, lte, desc, asc, sql, gte } from "drizzle-orm";
import { Navigation } from "@/components/navigation";
import { ReviewSession } from "@/components/review-session";
import { Brain, Clock, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";

export default async function ReviewPage() {
  const session = await requireUser();

  // Get due questions with their details
  const dueReviews = await db
    .select({
      reviewId: questionReview.id,
      questionId: questionReview.questionId,
      easeFactor: questionReview.easeFactor,
      interval: questionReview.interval,
      repetitions: questionReview.repetitions,
      totalReviews: questionReview.totalReviews,
      correctCount: questionReview.correctCount,
      nextReview: questionReview.nextReview,
      prompt: question.prompt,
      explanation: question.explanation,
      difficulty: question.difficulty,
      bankSlug: questionBank.slug,
      bankTitle: questionBank.title,
      moduleName: curriculumModule.name,
      moduleSlug: curriculumModule.slug,
    })
    .from(questionReview)
    .innerJoin(question, eq(questionReview.questionId, question.id))
    .innerJoin(questionBank, eq(question.bankId, questionBank.id))
    .innerJoin(curriculumModule, eq(questionBank.moduleId, curriculumModule.id))
    .where(and(eq(questionReview.userId, session.user.id), lte(questionReview.nextReview, new Date())))
    .orderBy(asc(questionReview.nextReview))
    .limit(20);

  // Get options for each due question
  const questionsWithOptions = await Promise.all(
    dueReviews.map(async (r) => {
      const opts = await db
        .select({ id: questionOption.id, text: questionOption.text })
        .from(questionOption)
        .where(eq(questionOption.questionId, r.questionId))
        .orderBy(asc(questionOption.order));
      return { ...r, options: opts };
    }),
  );

  // Stats
  const [totalReviewed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionReview)
    .where(eq(questionReview.userId, session.user.id));

  const [masteredCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionReview)
    .where(and(eq(questionReview.userId, session.user.id), gte(questionReview.interval, 21)));

  return (
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">مراجعة الأسئلة</h1>
            <p className="mt-1 text-muted-foreground">
              راجع الأسئلة التي حان وقتها بناءً على منحنى النسيان.
            </p>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-muted-foreground">بانتظار المراجعة</span>
              </div>
              <p className="text-2xl font-bold">{dueReviews.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-muted-foreground">إجمالي المراجعات</span>
              </div>
              <p className="text-2xl font-bold">{totalReviewed?.count ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-muted-foreground">أسئلة متقنة</span>
              </div>
              <p className="text-2xl font-bold">{masteredCount?.count ?? 0}</p>
            </div>
          </div>

          {questionsWithOptions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <h2 className="mb-2 text-xl font-semibold">لا توجد أسئلة للمراجعة</h2>
              <p className="mb-6 text-muted-foreground">
                أجب على بعض الاختبارات أولاً، وسيتم جدولة الأسئلة للمراجعة هنا.
              </p>
              <Link
                href="/curriculum"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <BookOpen className="h-4 w-4" />
                تصفح المنهج
              </Link>
            </div>
          ) : (
            <ReviewSession questions={questionsWithOptions} />
          )}
        </div>
      </main>
    </div>
  );
}
