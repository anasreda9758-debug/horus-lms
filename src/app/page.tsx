import Link from "next/link";
import { getSession } from "@/shared/session";
import { buttonVariants } from "@/components/ui/button";
import {
  BookOpen,
  Brain,
  Stethoscope,
  FlaskConical,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Shield,
} from "lucide-react";

export default async function Home() {
  const session = await getSession();
  const user = session?.user;

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-20 text-center lg:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            منصة تعليمية ذكية لطلاب الطب
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight lg:text-5xl xl:text-6xl">
            تعلّم الطب{" "}
            <span className="bg-gradient-to-l from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              بذكاء
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground lg:text-xl">
            منهج منظّم، محتوى غني بالصور والمحاضرات، اختبارات من أسئلة الامتحانات
            الحقيقية، ومساعد ذكي يجاوب على أسئلتك فورًا.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={buttonVariants({ size: "lg", className: "gap-2" })}
                >
                  <ArrowLeft className="h-4 w-4" />
                  لوحة الطالب
                </Link>
                <Link
                  href="/curriculum"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "gap-2",
                  })}
                >
                  <BookOpen className="h-4 w-4" />
                  تصفح المنهج
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className={buttonVariants({ size: "lg", className: "gap-2" })}
                >
                  ابدأ الآن مجانًا
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                  })}
                >
                  تسجيل الدخول
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 lg:py-24">
        <h2 className="mb-4 text-center text-3xl font-bold">لماذا Horus MED؟</h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          صُمّمت لتجربة تعلم أفضل: من المحتوى إلى التقييم، كل شيء في مكان واحد.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={BookOpen}
            title="منهج منظّم"
            description="محاضرات، سيمينارات، وعملي — كل محتوى الموديولات منظّم ومُقدّم بالتفصيل."
            color="text-blue-600 bg-blue-50 dark:bg-blue-950/40"
          />
          <FeatureCard
            icon={Brain}
            title="بطاقات تعليمية"
            description="ระบบ تكرار متباعد (SRS) يساعدك على حفظ المعلومات على المدى الطويل."
            color="text-purple-600 bg-purple-50 dark:bg-purple-950/40"
          />
          <FeatureCard
            icon={FlaskConical}
            title="محاكي OSPE"
            description="تمارين عمليّة بصور حقيقية من المعمل للاستعداد لامتحانات OSPE."
            color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
          />
          <FeatureCard
            icon={Stethoscope}
            title="حالات سريرية"
            description="حالات سريرية محاكاة لتطوير مهارات التفكير السريري."
            color="text-rose-600 bg-rose-50 dark:bg-rose-950/40"
          />
          <FeatureCard
            icon={GraduationCap}
            title="اختبارات حقيقية"
            description="بنوك أسئلة مستخرجة من امتحانات السنوات السابقة — أنت تتدرب على الأسئلة الفعلية."
            color="text-amber-600 bg-amber-50 dark:bg-amber-950/40"
          />
          <FeatureCard
            icon={Shield}
            title="مساعد ذكي"
            description="مساعد AI يجيب على أسئلتك بناءً على محتوى المحاضرة فقط — دقيق ومباشر."
            color="text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40"
          />
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-16 text-center lg:py-20">
            <h2 className="text-3xl font-bold">جاهز تبدأ؟</h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              سجّل حسابك وابدأ رحلة التعلم الآن. المحتوى الأساسي متاح، والمزيد مع
              الاشتراك.
            </p>
            <Link
              href="/sign-up"
              className={buttonVariants({
                size: "lg",
                className: "mt-8 gap-2",
              })}
            >
              إنشاء حساب مجاني
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>Horus University — MED 2026</span>
          <Link href="/pricing" className="hover:text-foreground">
            الأسعار
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-md hover:border-primary/20">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
