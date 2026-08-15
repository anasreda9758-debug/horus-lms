import Link from "next/link";
import { requireAdmin } from "@/shared/session";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminPage() {
  const session = await requireAdmin();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">لوحة الإدارة</h1>
      <p>مدير النظام: {session.user.email}</p>
      <p className="text-sm text-muted-foreground">
        بوابة مُقيّدة بالدور admin. تُبنى إدارة المستخدمين والاشتراكات هنا في
        M5.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        العودة للرئيسية
      </Link>
    </main>
  );
}
