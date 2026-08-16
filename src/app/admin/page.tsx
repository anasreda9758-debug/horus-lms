import Link from "next/link";
import { requireAdmin } from "@/shared/session";
import { buttonVariants } from "@/components/ui/button";
import {
  getPlans,
  getSubscriptionForUsers,
  listStudents,
} from "@/features/billing/queries";
import { AdminSubscriptionButtons } from "@/components/admin-subscription-buttons";

export default async function AdminPage() {
  const session = await requireAdmin();
  const [plans, students] = await Promise.all([getPlans(), listStudents()]);
  const subs = await getSubscriptionForUsers(students.map((s) => s.id));
  const subsByUser = new Map<string, { planName: string; planId: string; expiresAt: string }[]>();
  for (const s of subs) {
    if (!s.expiresAt || s.expiresAt <= new Date()) continue;
    const entry = subsByUser.get(s.userId) ?? [];
    entry.push({
      planId: s.planId,
      planName: s.plan?.name ?? "اشتراك",
      expiresAt: s.expiresAt.toISOString(),
    });
    subsByUser.set(s.userId, entry);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">لوحة الإدارة</h1>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          العودة للرئيسية
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        مدير النظام: {session.user.email} — فعّل الاشتراكات لطلابك يدويًا. الاشتراك
        النشط يفتح المحتوى المدفوع ويرفع سقف محادثات المعلم الذكي.
      </p>

      <div>
        <h2 className="mb-3 text-lg font-semibold">الطلاب والاشتراكات</h2>
        <ul className="grid gap-3">
          {students.map((s) => {
            const active = subsByUser.get(s.id) ?? [];
            return (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
              >
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.email}</p>
                </div>
                <AdminSubscriptionButtons
                  userId={s.id}
                  plans={plans}
                  active={active}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
