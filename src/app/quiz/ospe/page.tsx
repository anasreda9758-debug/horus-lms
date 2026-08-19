import Link from "next/link";
import { requireUser } from "@/shared/session";
import { getCurriculum } from "@/features/curriculum/queries";
import { withModuleAccess } from "@/features/billing/queries";
import { getBankBySlug } from "@/features/practice/queries";
import { Navigation } from "@/components/navigation";
import { BookOpen, Lock, Stethoscope } from "lucide-react";

export default async function OspeModuleSelectPage() {
  const session = await requireUser();
  const curriculum = await getCurriculum(session.user.id);
  const withAccess = await withModuleAccess(session.user.id, curriculum);
  const accessible = withAccess.filter((m) => m.access);

  const modulesWithOspe = await Promise.all(
    accessible.map(async (m) => {
      const bank = await getBankBySlug(`ospe-${m.slug}`);
      return { ...m, bank };
    }),
  );

  const term1 = modulesWithOspe.filter((m) => m.term === 1);
  const term2 = modulesWithOspe.filter((m) => m.term === 2);

  return (
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">اختبار OSPE</h1>
            <p className="mt-1 text-muted-foreground">
              اختار الموديول لبدء اختبار السريري.
            </p>
          </div>

          {modulesWithOspe.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">لا توجد موديولات متاحة. اشترِ موديولاً أو ترماً أولاً.</p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                عرض الأسعار
              </Link>
            </div>
          ) : (
            <>
              {term1.length > 0 && (
                <section className="mb-8">
                  <h2 className="mb-4 text-xl font-bold">الترم الأول</h2>
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {term1.map((m) => (
                      <OspeModuleCard key={m.id} m={m} />
                    ))}
                  </ul>
                </section>
              )}

              {term2.length > 0 && (
                <section>
                  <h2 className="mb-4 text-xl font-bold">الترم الثاني</h2>
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {term2.map((m) => (
                      <OspeModuleCard key={m.id} m={m} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function OspeModuleCard({
  m,
}: {
  m: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    term: number;
    bank: { id: string; title: string } | undefined;
  };
}) {
  if (!m.bank) return null;
  return (
    <li>
      <Link
        href={`/quiz/ospe/${m.slug}`}
        className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-md"
      >
        <div className="flex items-start gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold leading-tight group-hover:text-primary">
              {m.name}
            </h3>
            {m.description ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {m.description}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              اختبار سريري · {m.bank.title}
            </p>
          </div>
          <BookOpen className="h-4 w-4 text-muted-foreground/40" />
        </div>
      </Link>
    </li>
  );
}
