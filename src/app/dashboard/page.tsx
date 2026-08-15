import Link from "next/link";
import { requireUser } from "@/shared/session";
import { getOverallProgress } from "@/features/curriculum/queries";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/progress-bar";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await requireUser();
  const user = session.user;
  const progress = await getOverallProgress(user.id);

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

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/curriculum" className={buttonVariants({ size: "lg" })}>
          تصفح المنهج
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          الرئيسية
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
