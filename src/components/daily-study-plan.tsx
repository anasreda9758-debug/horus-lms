"use client";

import Link from "next/link";
import { ArrowRight, Brain, BookOpen, ClipboardCheck, Target } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type NextLecture = {
  title: string;
  slug: string;
  moduleName: string;
  durationMin: number | null;
} | null;

export function DailyStudyPlan({
  nextLecture,
  dueReviewCount,
  weakModule,
}: {
  nextLecture: NextLecture;
  dueReviewCount: number;
  weakModule: { name: string; slug: string } | null;
}) {
  const { t } = useLocale();
  const primaryHref = nextLecture
    ? `/lecture/${nextLecture.slug}`
    : dueReviewCount > 0
      ? "/review"
      : weakModule
        ? `/curriculum/${weakModule.slug}`
        : "/curriculum";

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <Target className="h-3.5 w-3.5" />
            {t("TODAY’S STUDY PLAN", "خطة مذاكرة اليوم")}
          </div>
          <h2 className="text-xl font-bold">{t("One focused session, built from your progress.", "جلسة مركزة مبنية على تقدمك.")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Complete the steps in order or choose the one you need most.", "أكمل الخطوات بالترتيب أو ابدأ بالأهم لك.")}
          </p>
        </div>
        <Link
          href={primaryHref}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("Start today’s session", "ابدأ جلسة اليوم")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <PlanStep
          icon={BookOpen}
          title={t("1. Learn", "١. تعلّم")}
          detail={nextLecture ? `${nextLecture.moduleName} · ${nextLecture.title}${nextLecture.durationMin ? ` · ${nextLecture.durationMin} min` : ""}` : t("Choose your next lecture", "اختر محاضرتك التالية")}
          href={nextLecture ? `/lecture/${nextLecture.slug}` : "/curriculum"}
        />
        <PlanStep
          icon={Brain}
          title={t("2. Recall", "٢. استدعِ")}
          detail={dueReviewCount > 0 ? t(`${dueReviewCount} due review questions`, `${dueReviewCount} أسئلة مستحقة للمراجعة`) : t("Review 10 key flashcards", "راجع 10 بطاقات أساسية")}
          href={dueReviewCount > 0 ? "/review" : "/flashcards"}
        />
        <PlanStep
          icon={ClipboardCheck}
          title={t("3. Check", "٣. اختبر")}
          detail={weakModule ? t(`Strengthen ${weakModule.name}`, `قوِّ ${weakModule.name}`) : t("Finish with a short quiz", "اختم باختبار قصير")}
          href={weakModule ? `/curriculum/${weakModule.slug}` : "/curriculum"}
        />
      </div>
    </section>
  );
}

function PlanStep({
  icon: Icon,
  title,
  detail,
  href,
}: {
  icon: React.ElementType;
  title: string;
  detail: string;
  href: string;
}) {
  return (
    <Link href={href} className="group rounded-xl border border-border/80 bg-card/80 p-4 transition hover:border-primary/40 hover:bg-card">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
    </Link>
  );
}
