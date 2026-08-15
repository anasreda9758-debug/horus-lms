import Link from "next/link";
import { getSession } from "@/shared/session";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

export default async function Home() {
  const session = await getSession();
  const user = session?.user;
  const roleLabel = user?.role === "admin" ? "مدير" : "طالب";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="max-w-2xl text-4xl font-bold leading-relaxed">
        منصة التعلم الذكية
      </h1>
      <p className="max-w-md text-lg leading-8 text-muted-foreground">
        رحلة تعلم ذكية لطلاب الطب: منهج منظّم، محاضرات، اختبارات، ومساعد ذكي.
      </p>
      {user ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            مرحبًا {user.name} · <span className="font-medium">{roleLabel}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              لوحة الطالب
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
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                لوحة الإدارة
              </Link>
            ) : null}
            <SignOutButton />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
            تسجيل الدخول
          </Link>
          <Link
            href="/sign-up"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            إنشاء حساب
          </Link>
        </div>
      )}
    </main>
  );
}
