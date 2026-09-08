import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { getAccessibleModuleBySlug } from "@/features/access/learning-access";
import { Navigation } from "@/components/navigation";
import { PracticalPractice } from "@/components/practical-practice";
import { fixturesAllowed, PILOT_MODULE } from "@/features/practical/model";

export default async function AnatomyPracticePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fixtures?: string; mode?: string }>;
}) {
  const { slug } = await params; const query = await searchParams;
  if (slug !== PILOT_MODULE) notFound();
  const fixtures = query.fixtures === "1";
  if (fixtures && !fixturesAllowed(process.env.NODE_ENV, fixtures)) notFound();
  const session = await requireUser();
  const access = await getAccessibleModuleBySlug(session.user, slug);
  return <div className="flex min-w-0 flex-1"><Navigation user={session.user} isAdmin={session.user.role === "admin"} />
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
      <Link href={`/curriculum/${slug}/practical`} className="text-sm text-primary">Renal / Practical / Anatomy</Link>
      <header><p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Renal Practical</p><h1 className="mt-1 text-3xl font-bold">Anatomy · {query.mode === "wrong" ? "Wrong Questions" : "Practice"}</h1></header>
      {!access.ok ? <div className="rounded-xl border bg-card p-6">Module access is required. No practical questions or images have been loaded.</div> : <>
        {process.env.NODE_ENV === "development" && <Link href={`?fixtures=${fixtures ? "0" : "1"}`} className="inline-block text-sm text-primary underline">{fixtures ? "Return to approved bank" : "Open development fixtures (not medical content)"}</Link>}
        <PracticalPractice key={`${fixtures}-${query.mode}`} fixtures={fixtures} wrongOnly={query.mode === "wrong"} />
      </>}
    </div></main></div>;
}
