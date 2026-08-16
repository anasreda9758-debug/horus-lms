import Link from "next/link";
import { requireUser } from "@/shared/session";
import { getOverallProgress } from "@/features/curriculum/queries";
import { getModuleAccuracy } from "@/features/practice/queries";
import { getActiveSubscriptions } from "@/features/billing/queries";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await requireUser();
  const user = session.user;
  const progress = await getOverallProgress(user.id);
  const accuracy = await getModuleAccuracy(user.id);
  const subs = (await getActiveSubscriptions(user.id)).filter((s) => s.expiresAt > new Date());

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">لوحة الطالب</h1>
      <p>
        مرحبًا {user.name} · {user.email}
      </p>

      <div className="w-full max-w-md rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">التقدم الإجمالي</h2>
          <span className="text-sm text-muted-foreground">
            {progress.completed}/{progress.total} محاضرة
          </span>
        </div>
        <ProgressBar percent={progress.percent} />
        <p className="mt-3 text-2xl font-bold">{progress.percent}%</p>
      </div>

      <div className="w-full max-w-md rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">دقة الاختبارات</h2>
        </div>
        {accuracy.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا توجد اختبارات مكتملة بعد — ابدأ من المنهج.
          </p>
        ) : (
          <ul className="grid gap-3">
            {accuracy.map((m) => (
              <li key={m.moduleSlug}>
                <div className="flex items-center justify-between text-sm">
                  <span>{m.moduleName}</span>
                  <span className="text-muted-foreground">
                    {m.correct}/{m.total} صحيحة
                  </span>
                </div>
                <ProgressBar percent={m.percent} />
                <p className="mt-1 text-end text-lg font-bold">{m.percent}%</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="w-full max-w-md rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">اشتراكي</h2>
          <Link href="/pricing" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            الأسعار
          </Link>
        </div>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            لا يوجد اشتراك نشط حاليًا — اشترك في موديول أو ترم أو السنة كاملة لفتح المحتوى.
          </p>
        ) : (
          <ul className="grid gap-2">
            {subs.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span className="font-medium">{s.plan.name}</span>
                <span className="text-muted-foreground">
                  حتى {s.expiresAt.toLocaleDateString("ar-EG")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/curriculum" className={buttonVariants({ size: "lg" })}>
          تصفح المنهج
        </Link>
        <Link href="/ospe" className={buttonVariants({ variant: "secondary", size: "lg" })}>
          🔬 محاكي OSPE
        </Link>
        <Link href="/flashcards" className={buttonVariants({ variant: "secondary", size: "lg" })}>
          🧠 بطاقات
        </Link>
        <Link href="/cases" className={buttonVariants({ variant: "secondary", size: "lg" })}>
          🩺 حالات سريرية
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          الرئيسية
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
