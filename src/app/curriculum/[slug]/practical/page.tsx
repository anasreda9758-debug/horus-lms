import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/session";
import { getAccessibleModuleBySlug } from "@/features/access/learning-access";
import { Navigation } from "@/components/navigation";
import { PILOT_MODULE } from "@/features/practical/model";

export default async function PracticalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== PILOT_MODULE) notFound();
  const session = await requireUser();
  const access = await getAccessibleModuleBySlug(session.user, slug);
  return <div className="flex flex-1 min-w-0"><Navigation user={session.user} isAdmin={session.user.role === "admin"} />
    <main className="min-w-0 flex-1 p-6 lg:p-8"><div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/curriculum/${slug}`} className="text-sm text-primary">Renal / Curriculum</Link>
      <h1 className="text-3xl font-bold">Renal Practical</h1>
      {!access.ok ? <p>Module access is required. A lecture preview does not unlock the practical bank.</p> : <Link href={`/curriculum/${slug}/practical/anatomy`} className="block rounded-2xl border bg-card p-7 hover:border-primary">
        <h2 className="text-xl font-semibold">Anatomy</h2><p className="mt-2 text-muted-foreground">Labeled images · Single-choice questions · Saved mistakes · Separate practical progress</p>
      </Link>}
    </div></main></div>;
}
