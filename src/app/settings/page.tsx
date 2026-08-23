import { requireUser } from "@/shared/session";
import { getProfile } from "@/features/gamification/queries";
import { getActiveSubscriptions } from "@/features/billing/queries";
import { db } from "@/shared/db";
import { user } from "@/features/auth/schema";
import { eq } from "drizzle-orm";
import { Navigation } from "@/components/navigation";
import { SettingsForm } from "@/components/settings-form";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const session = await requireUser();
  const profile = await getProfile(session.user.id);
  const subs = await getActiveSubscriptions(session.user.id);
  const activeSub = subs.find((s) => s.expiresAt > new Date());

  const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

  return (
    <div className="flex flex-1">
      <Navigation user={{ name: session.user.name, email: session.user.email }} isAdmin={session.user.role === "admin"} />
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">الإعدادات</h1>
              <p className="mt-1 text-muted-foreground">إدارة حسابك وتفضيلاتك.</p>
            </div>
          </div>

          <SettingsForm
            user={{
              name: session.user.name,
              email: session.user.email,
              role: session.user.role ?? "student",
              createdAt: dbUser?.createdAt ?? new Date(),
            }}
            profile={profile}
            subscription={activeSub ? { planName: activeSub.plan.name, expiresAt: activeSub.expiresAt } : null}
          />
        </div>
      </main>
    </div>
  );
}
