import Link from "next/link";
import { requireUser } from "@/shared/session";
import { db } from "@/shared/db";
import { questionBookmark, question, questionOption, questionBank } from "@/features/practice/schema";
import { curriculumModule } from "@/features/curriculum/schema";
import { eq, asc } from "drizzle-orm";
import { Navigation } from "@/components/navigation";
import { Bookmark, BookOpen } from "lucide-react";

export default async function BookmarksPage() {
  const session = await requireUser();

  const bookmarks = await db
    .select({
      id: questionBookmark.id,
      questionId: questionBookmark.questionId,
      createdAt: questionBookmark.createdAt,
      prompt: question.prompt,
      explanation: question.explanation,
      difficulty: question.difficulty,
      bankSlug: questionBank.slug,
      bankTitle: questionBank.title,
      moduleName: curriculumModule.name,
      moduleSlug: curriculumModule.slug,
    })
    .from(questionBookmark)
    .innerJoin(question, eq(questionBookmark.questionId, question.id))
    .innerJoin(questionBank, eq(question.bankId, questionBank.id))
    .innerJoin(curriculumModule, eq(questionBank.moduleId, curriculumModule.id))
    .where(eq(questionBookmark.userId, session.user.id))
    .orderBy(asc(questionBookmark.createdAt));

  // Get options for each question
  const questionsWithOptions = await Promise.all(
    bookmarks.map(async (b) => {
      const opts = await db
        .select({ id: questionOption.id, text: questionOption.text })
        .from(questionOption)
        .where(eq(questionOption.questionId, b.questionId))
        .orderBy(asc(questionOption.order));
      return { ...b, options: opts };
    }),
  );

  return (
    <div className="flex flex-1">
      <Navigation user={{ name: session.user.name, email: session.user.email }} isAdmin={session.user.role === "admin"} />
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">الأسئلة المحفوظة</h1>
            <p className="mt-1 text-muted-foreground">
              أسئلة حفظتها للمراجعة لاحقاً.
            </p>
          </div>

          {questionsWithOptions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Bookmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">لم تحفظ أي أسئلة بعد.</p>
              <p className="mt-1 text-sm text-muted-foreground">اضغط على أيقونة الحفظ أثناء الاختبار لحفظ الأسئلة الصعبة.</p>
              <Link
                href="/curriculum"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <BookOpen className="h-4 w-4" />
                تصفح المنهج
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {questionsWithOptions.map((q, i) => {
                const correctIdx = q.options.findIndex((o) => o.id !== q.options[0]?.id);
                return (
                  <div key={q.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">{q.moduleName} · {q.bankTitle}</span>
                      <span className={`ms-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                        q.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-600" :
                        q.difficulty === "hard" ? "bg-red-500/10 text-red-600" :
                        "bg-amber-500/10 text-amber-600"
                      }`}>
                        {q.difficulty === "easy" ? "سهل" : q.difficulty === "hard" ? "صعب" : "متوسط"}
                      </span>
                    </div>
                    <p className="mb-3 text-sm leading-relaxed">{q.prompt}</p>
                    <ul className="mb-3 space-y-1.5">
                      {q.options.map((o, j) => (
                        <li key={o.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                            {String.fromCharCode(65 + j)}
                          </span>
                          {o.text}
                        </li>
                      ))}
                    </ul>
                    {q.explanation && (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <strong className="text-foreground">الشرح:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
