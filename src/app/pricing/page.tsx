import Link from "next/link";
import { db } from "@/shared/db";
import { getSession } from "@/shared/session";
import { getPlans, getActiveSubscriptions } from "@/features/billing/queries";
import { PurchaseButton } from "@/components/purchase-button";
import { buttonVariants } from "@/components/ui/button";

function fmtDays(days: number) {
  if (days >= 365) return "عام كامل";
  if (days >= 30) {
    const months = Math.round((days / 30) * 2) / 2;
    return `${months} شهر`;
  }
  return `${days} يوم`;
}

type PlanRow = {
  id: string;
  name: string;
  priceEg: number;
  durationDays: number;
};

function PlanCard({
  plan,
  title,
  subtitle,
  highlight,
  owned,
  userId,
}: {
  plan: PlanRow;
  title: string;
  subtitle?: string;
  highlight?: boolean;
  owned: boolean;
  userId?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl p-6 ring-1 ${
        highlight ? "bg-primary/5 ring-primary" : "bg-card ring-foreground/10"
      }`}
    >
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <p className="text-3xl font-bold">
        {plan.priceEg} <span className="text-base font-medium text-muted-foreground">ج</span>
      </p>
      <p className="text-sm text-muted-foreground">مدة الصلاحية: {fmtDays(plan.durationDays)}</p>
      <div className="mt-auto">
        {userId ? (
          <PurchaseButton planId={plan.id} priceEg={plan.priceEg} owned={owned} />
        ) : (
          <Link href="/sign-in" className={`${buttonVariants({ className: "w-full" })}`}>
            سجّل الدخول للاشتراك
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function PricingPage() {
  const session = await getSession();
  const userId = session?.user.id;

  const [plans, modules, subs] = await Promise.all([
    getPlans(),
    db.query.curriculumModule.findMany({
      orderBy: (m, { asc }) => [asc(m.order)],
    }),
    userId ? getActiveSubscriptions(userId) : Promise.resolve([]),
  ]);

  const owned = new Set(subs.filter((s) => s.expiresAt > new Date()).map((s) => s.planId));
  const moduleBySlug = new Map(modules.map((m) => [m.slug, m]));

  const modulePlans = plans.filter((p) => p.scope === "module");
  const termPlans = plans.filter((p) => p.scope === "term");
  const yearPlan = plans.find((p) => p.scope === "year");

  const nonCoreSlugs = new Set(["mt-104", "en-105", "uni-205"]);
  const corePlans = modulePlans.filter((p) => !nonCoreSlugs.has(p.scopeRef ?? ""));
  const nonCorePlans = modulePlans.filter((p) => nonCoreSlugs.has(p.scopeRef ?? ""));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">الأسعار والاشتراك</h1>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          الرئيسية
        </Link>
      </div>

      <p className="text-muted-foreground">
        اشترك في الموديول الذي تحتاجه، أو وفر باختيار الترم أو السنة كاملة. جميع
        المحتويات مدفوعة، والاشتراك يفتح المحاضرات والاختبارات والمعلم الذكي لكل ما
        يغطّيه المستوى المختار.
      </p>

      <section>
        <h2 className="mb-3 text-xl font-bold">السنة كاملة — أفضل قيمة</h2>
        {yearPlan ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <PlanCard
              plan={yearPlan}
              title="السنة كاملة"
              subtitle="كل موديولات الترمين الأول والثاني لمدة عام كامل."
              highlight
              owned={owned.has(yearPlan.id)}
              userId={userId}
            />
            <div className="hidden sm:block" />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">اشتراك الترم</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {termPlans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              title={p.name}
              subtitle={
                p.scopeRef === "1"
                  ? "AEH-101 · PPG-102 · PMB-103 · MT-104 · EN-105"
                  : "RS-201 · CVS-202 · RAU-203 · IBL-204 · UNI-205"
              }
              owned={owned.has(p.id)}
              userId={userId}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">الموديولات الأساسية — 119 ج لكل موديول</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {corePlans.map((p) => {
            const m = moduleBySlug.get(p.scopeRef ?? "");
            return (
              <li key={p.id}>
                <PlanCard
                  plan={p}
                  title={m?.name ?? p.name}
                  subtitle={m?.description ?? undefined}
                  owned={owned.has(p.id)}
                  userId={userId}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">المواد غير الأساسية — 50 ج لكل مادة</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {nonCorePlans.map((p) => {
            const m = moduleBySlug.get(p.scopeRef ?? "");
            return (
              <li key={p.id}>
                <PlanCard
                  plan={p}
                  title={m?.name ?? p.name}
                  subtitle={m?.description ?? undefined}
                  owned={owned.has(p.id)}
                  userId={userId}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-sm text-muted-foreground">
        الأسعار بالجنيه المصري. مدة الموديولات الأساسية تختلف حسب الموديول
        (من شهر ونصف إلى 4 شهور)، والمواد غير الأساسية صالحة طوال الترم.
      </p>
    </main>
  );
}
