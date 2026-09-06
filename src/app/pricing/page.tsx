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
import { getLocale, localize } from "@/shared/locale";
import { moduleDescription } from "@/shared/curriculum-copy";

function fmtDays(days: number, locale: "en" | "ar") {
  if (days >= 365) return locale === "ar" ? "عام كامل" : "Full year";
  if (days >= 30) {
    const months = Math.round((days / 30) * 2) / 2;
    return locale === "ar" ? `${months} شهر` : `${months} months`;
  }
  return locale === "ar" ? `${days} يوم` : `${days} days`;
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
  locale,
}: {
  plan: PlanRow;
  title: string;
  subtitle?: string;
  highlight?: boolean;
  owned: boolean;
  userId?: string;
  features?: string[];
  locale: "en" | "ar";
}) {
  const t = (english: string, arabic: string) => localize(locale, english, arabic);
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
            {t("Best value", "أفضل قيمة")}
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
          EGP
        </span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        <Calendar className="me-1 inline h-3.5 w-3.5" />
        {t("Valid for", "مدة الصلاحية")}: {fmtDays(plan.durationDays, locale)}
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
            {t("Sign in to subscribe", "سجّل الدخول للاشتراك")}
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function PricingPage() {
  const session = await getSession();
  const locale = await getLocale();
  const t = (english: string, arabic: string) => localize(locale, english, arabic);
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
              {t("Choose what fits you", "اختر ما يناسبك")}
            </span>
            <h1 className="mt-4 text-3xl font-bold lg:text-4xl">
              {t("Plans & subscription", "الأسعار والاشتراك")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {t("Subscribe to a module, term, or full academic year. A subscription unlocks lectures, quizzes, and the study tutor.", "اشترك في الموديول الذي تحتاجه، أو وفر باختيار الترم أو السنة كاملة. جميع المحتويات مدفوعة، والاشتراك يفتح المحاضرات والاختبارات والمعلم الذكي.")}
            </p>
          </div>

          {/* Year Plan - Featured */}
          <section className="mb-12">
            {yearPlan && (
              <div className="mx-auto max-w-md">
                <PlanCard
                  plan={yearPlan}
                  title={t("Full academic year", "السنة كاملة")}
                  subtitle={t("Every module in Terms 1 and 2", "كل موديولات الترمين الأول والثاني")}
                  highlight
                  owned={owned.has(yearPlan.id)}
                  userId={userId}
                  locale={locale}
                  features={[
                    t("All modules (10 modules)", "جميع الموديولات (10 موديولات)"),
                    t("All lectures and seminars", "جميع المحاضرات والسيمينارات"),
                    t("Source-based question banks", "اختبارات بنوك الأسئلة الحقيقية"),
                    t("Unlimited study tutor", "المعلم الذكي بدون حد"),
                    t("Spaced-repetition flashcards", "بطاقات تعليمية SRS"),
                    t("OSPE simulator", "محاكي OSPE"),
                  ]}
                />
              </div>
            )}
          </section>

          {/* Term Plans */}
          <section className="mb-12">
            <h2 className="mb-4 text-center text-xl font-bold">
              {t("Term subscriptions", "اشتراك الترم")}
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
                  locale={locale}
                  features={[
                    t("5 modules in the term", "5 موديولات في الترم"),
                    t("All lectures and practice", "جميع المحاضرات والتمارين"),
                    t("Question-bank quizzes", "اختبارات الأسئلة"),
                    t("Study tutor", "المعلم الذكي"),
                  ]}
                />
              ))}
            </div>
          </section>

          {/* Core Module Plans */}
          <section className="mb-12">
            <h2 className="mb-4 text-center text-xl font-bold">
              {t("Core modules", "الموديولات الأساسية")}
            </h2>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {t("119 EGP per module — valid for 1.5 to 4 months", "119 ج.م لكل موديول — مدة شهر ونصف إلى 4 شهور")}
            </p>
            <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {corePlans.map((p) => {
                const m = moduleBySlug.get(p.scopeRef ?? "");
                return (
                  <li key={p.id}>
                    <PlanCard
                      plan={p}
                      title={m?.name ?? p.name}
                      subtitle={moduleDescription(m?.slug ?? p.scopeRef ?? "", m?.description ?? null, locale) ?? undefined}
                      owned={owned.has(p.id)}
                      userId={userId}
                      locale={locale}
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
                {t("Additional modules", "المواد غير الأساسية")}
              </h2>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                {t("50 EGP per module — valid for the full term", "50 ج.م لكل مادة — صالحة طوال الترم")}
              </p>
              <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {nonCorePlans.map((p) => {
                  const m = moduleBySlug.get(p.scopeRef ?? "");
                  return (
                    <li key={p.id}>
                      <PlanCard
                        plan={p}
                        title={m?.name ?? p.name}
                        subtitle={moduleDescription(m?.slug ?? p.scopeRef ?? "", m?.description ?? null, locale) ?? undefined}
                        owned={owned.has(p.id)}
                        userId={userId}
                        locale={locale}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {t("Prices are in Egyptian pounds. All content requires a subscription.", "الأسعار بالجنيه المصري. جميع المحتويات مدفوعة.")}
          </p>
        </div>
      </main>
    </div>
  );
}
