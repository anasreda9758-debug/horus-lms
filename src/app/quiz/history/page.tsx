import Link from "next/link";
import { requireUser } from "@/shared/session";
import { Navigation } from "@/components/navigation";
import { getQuizHistory } from "@/features/practice/queries";
import { Clock, BarChart3, Trophy, Calendar } from "lucide-react";

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}د ${s}ث` : `${s}ث`;
}

function difficultyLabel(d: string | null) {
  if (d === "easy") return { text: "سهل", cls: "bg-emerald-500/10 text-emerald-600" };
  if (d === "hard") return { text: "صعب", cls: "bg-red-500/10 text-red-600" };
  return { text: "متوسط", cls: "bg-amber-500/10 text-amber-600" };
}

function percentColor(p: number) {
  if (p >= 80) return "text-emerald-600";
  if (p >= 50) return "text-amber-600";
  return "text-red-600";
}

export default async function QuizHistoryPage() {
  const session = await requireUser();
  const history = await getQuizHistory(session.user.id, 50);

  // Calculate stats
  const totalAttempts = history.length;
  const avgPercent = totalAttempts > 0
    ? Math.round(history.reduce((s, h) => s + h.percent, 0) / totalAttempts)
    : 0;
  const bestPercent = totalAttempts > 0 ? Math.max(...history.map((h) => h.percent)) : 0;

  return (
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">تاريخ الاختبارات</h1>

          {/* Stats Cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">إجمالي المحاولات</span>
              </div>
              <p className="mt-2 text-3xl font-bold">{totalAttempts}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span className="text-sm">متوسط النسبة</span>
              </div>
              <p className={`mt-2 text-3xl font-bold ${percentColor(avgPercent)}`}>{avgPercent}%</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="h-4 w-4" />
                <span className="text-sm">أفضل نتيجة</span>
              </div>
              <p className={`mt-2 text-3xl font-bold ${percentColor(bestPercent)}`}>{bestPercent}%</p>
            </div>
          </div>

          {/* History List */}
          {history.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-border bg-card p-12 text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <h2 className="mb-2 text-xl font-semibold">لا يوجد تاريخ بعد</h2>
              <p className="mb-6 text-muted-foreground">ابدأ اختباراً yeniً لتظهر نتائجك هنا.</p>
              <Link
                href="/curriculum"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                تصفح المنهج
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {history.map((h) => {
                const diff = difficultyLabel(h.difficulty);
                return (
                  <Link
                    key={h.id}
                    href={`/quiz/${h.bankSlug}?count=${h.total}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{h.bankTitle}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${diff.cls}`}>
                          {diff.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(h.completedAt ?? h.startedAt)}
                        </span>
                        <span>{h.moduleName}</span>
                        {h.timeLimitSec ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(h.elapsedSec)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {h.score}/{h.total}
                      </span>
                      <span className={`text-2xl font-bold ${percentColor(h.percent)}`}>
                        {h.percent}%
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
