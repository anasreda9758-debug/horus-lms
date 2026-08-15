import Link from "next/link";
import { requireUser } from "@/shared/session";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await requireUser();
  const user = session.user;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">لوحة الطالب</h1>
      <p>
        مرحبًا {user.name} · {user.email}
      </p>
      <p className="text-sm text-muted-foreground">
        صفحة محمية — لا يمكن الوصول إليها بدون تسجيل الدخول. يبدأ بناء المنهج
        والتتبع في المرحلة القادمة.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          العودة للرئيسية
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
