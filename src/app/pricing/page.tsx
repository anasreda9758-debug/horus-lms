import Link from "next/link";
import { db } from "@/shared/db";
import { getSession } from "@/shared/session";
import { getPlans, getActiveSubscriptions } from "@/features/billing/queries";
import { PurchaseButton } from "@/components/purchase-button";
import { Navigation } from "@/components/navigation";
import {
  Check,
  Crown,
  Calendar,
  Sparkles,
} from "lucide-react";

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
  features,
}: {
  plan: PlanRow;
  title: string;
  subtitle?: string;
  highlight?: boolean;
  owned: boolean;
  userId?: string;
  features?: string[];
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
        highlight
          ? "border-primary bg-gradient-to-b from-primary/5 to-transparent shadow-md"
          : "border-border bg-card"
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            <Crown className="h-3 w-3" />
            أفضل قيمة
          </span>
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="mb-4">
        <span className="text-4xl font-bold">{plan.priceEg}</span>
        <span className="me-1 text-base font-medium text-muted-foreground">
          ج.م
        </span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        <Calendar className="me-1 inline h-3.5 w-3.5" />
        مدة الصلاحية: {fmtDays(plan.durationDays)}
      </p>
      {features && features.length > 0 && (
        <ul className="mb-6 space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto">
        {userId ? (
          <PurchaseButton planId={plan.id} priceEg={plan.priceEg} owned={owned} />
        ) : (
          <Link
            href="/sign-in"
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
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

  const owned = new Set(
    subs.filter((s) => s.expiresAt > new Date()).map((s) => s.planId)
  );
  const moduleBySlug = new Map(modules.map((m) => [m.slug, m]));

  const modulePlans = plans.filter((p) => p.scope === "module");
  const termPlans = plans.filter((p) => p.scope === "term");
  const yearPlan = plans.find((p) => p.scope === "year");

  const nonCoreSlugs = new Set(["mt-104", "en-105", "uni-205"]);
  const corePlans = modulePlans.filter(
    (p) => !nonCoreSlugs.has(p.scopeRef ?? "")
  );
  const nonCorePlans = modulePlans.filter((p) =>
    nonCoreSlugs.has(p.scopeRef ?? "")
  );

  return (
    <div className="flex flex-1">
      {session?.user ? (
        <Navigation
          user={{ name: session.user.name, email: session.user.email }}
          isAdmin={session.user.role === "admin"}
        />
      ) : null}

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              اختر ما يناسبك
            </span>
            <h1 className="mt-4 text-3xl font-bold lg:text-4xl">
              الأسعار والاشتراك
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              اشترك في الموديول الذي تحتاجه، أو وفر باختيار الترم أو السنة
              كاملة. جميع المحتويات مدفوعة، والاشتراك يفتح المحاضرات والاختبارات
              والمعلم الذكي.
            </p>
          </div>

          {/* Year Plan - Featured */}
          <section className="mb-12">
            {yearPlan && (
              <div className="mx-auto max-w-md">
                <PlanCard
                  plan={yearPlan}
                  title="السنة كاملة"
                  subtitle="كل موديولات الترمين الأول والثاني"
                  highlight
                  owned={owned.has(yearPlan.id)}
                  userId={userId}
                  features={[
                    "جميع الموديولات (10 موديولات)",
                    "جميع المحاضرات والسيمينارات",
                    "اختبارات بنوك الأسئلة الحقيقية",
                    "المعلم الذكي بدون حد",
                    "بطاقات تعليمية SRS",
                    "محاكي OSPE",
                  ]}
                />
              </div>
            )}
          </section>

          {/* Term Plans */}
          <section className="mb-12">
            <h2 className="mb-4 text-center text-xl font-bold">
              اشتراك الترم
            </h2>
            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
              {termPlans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  title={p.name}
                  subtitle={
                    p.scopeRef === "1"
                      ? "AEH · PPG · PMB · MT · EN"
                      : "RS · CVS · RAU · IBL · UNI"
                  }
                  owned={owned.has(p.id)}
                  userId={userId}
                  features={[
                    "5 موديولات في الترم",
                    "جميع المحاضرات والتمارين",
                    "اختبارات الأسئلة",
                    "المعلم الذكي",
                  ]}
                />
              ))}
            </div>
          </section>

          {/* Core Module Plans */}
          <section className="mb-12">
            <h2 className="mb-4 text-center text-xl font-bold">
              الموديولات الأساسية
            </h2>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              119 ج.م لكل موديول — مدة شهر ونصف إلى 4 شهور
            </p>
            <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Non-Core Module Plans */}
          {nonCorePlans.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 text-center text-xl font-bold">
                المواد غير الأساسية
              </h2>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                50 ج.م لكل مادة — صالحة طوال الترم
              </p>
              <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          )}

          <p className="text-center text-sm text-muted-foreground">
            الأسعار بالجنيه المصري. جميع المحتويات مدفوعة.
          </p>
        </div>
      </main>
    </div>
  );
}
