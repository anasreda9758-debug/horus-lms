import Link from "next/link";
import { requireUser } from "@/shared/session";
import { getOverallProgress } from "@/features/curriculum/queries";
import { getModuleAccuracy } from "@/features/practice/queries";
import { getActiveSubscriptions } from "@/features/billing/queries";
import { getProfile } from "@/features/gamification/queries";
import { ProgressBar } from "@/components/progress-bar";
import { Navigation } from "@/components/navigation";
import {
  BookOpen,
  FlaskConical,
  Brain,
  Stethoscope,
  Trophy,
  CreditCard,
  Target,
  Zap,
  Swords,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await requireUser();
  const user = session.user;
  const progress = await getOverallProgress(user.id);
  const accuracy = await getModuleAccuracy(user.id);
  const subs = (await getActiveSubscriptions(user.id)).filter(
    (s) => s.expiresAt > new Date()
  );
  const profile = await getProfile(user.id);

  const totalCorrect = accuracy.reduce((s, m) => s + m.correct, 0);
  const totalAnswered = accuracy.reduce((s, m) => s + m.total, 0);
  const avgAccuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return (
    <div className="flex flex-1">
      <Navigation user={{ name: user.name, email: user.email }} isAdmin={user.role === "admin"} />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">مرحبًا {user.name}</h1>
            <p className="mt-1 text-muted-foreground">{user.email}</p>
          </div>

          {/* Stats Grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Zap}
              label="المستوى والخبرة"
              value={`المستوى ${profile.level}`}
              sub={`${profile.totalXp} XP · ${profile.xpToNext} XP للمستوى التالي`}
              color="text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40"
            />
            <StatCard
              icon={Target}
              label="التقدم"
              value={`${progress.percent}%`}
              sub={`${progress.completed} / ${progress.total} محاضرة`}
              color="text-blue-600 bg-blue-50 dark:bg-blue-950/40"
            />
            <StatCard
              icon={Trophy}
              label="دقة الاختبارات"
              value={totalAnswered > 0 ? `${avgAccuracy}%` : "—"}
              sub={
                totalAnswered > 0
                  ? `${totalCorrect} من ${totalAnswered} صحيحة`
                  : "لم تبدأ اختبارات بعد"
              }
              color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
            />
            <StatCard
              icon={Swords}
              label="التحديات"
              value={`${profile.battlesWon}W / ${profile.battlesLost}L`}
              sub="سجل المباريات"
              color="text-red-600 bg-red-50 dark:bg-red-950/40"
            />
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">روابط سريعة</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <QuickAction href="/curriculum" icon={BookOpen} label="تصفح المنهج" />
              <QuickAction href="/flashcards" icon={Brain} label="البطاقات التعليمية" />
              <QuickAction href="/cases" icon={Stethoscope} label="الحالات السريرية" />
              <QuickAction href="/ospe" icon={FlaskConical} label="محاكي OSPE" />
              <QuickAction href="/battles" icon={Swords} label="تحدي الأقران" />
              <QuickAction href="/leaderboard" icon={Trophy} label="لوحة المتصدرين" />
            </div>
          </div>

          {/* Quiz Accuracy by Module */}
          {accuracy.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">نتائج الاختبارات</h2>
                <Link
                  href="/curriculum"
                  className="text-sm text-primary hover:underline"
                >
                  عرض المنهج
                </Link>
              </div>
              <ul className="space-y-4">
                {accuracy.map((m) => (
                  <li key={m.moduleSlug}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{m.moduleName}</span>
                      <span className="text-muted-foreground">
                        {m.correct}/{m.total} صحيحة ({m.percent}%)
                      </span>
                    </div>
                    <ProgressBar percent={m.percent} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm"
    >
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
