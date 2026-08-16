import { requireUser } from "@/shared/session";
import { OspeSimulator } from "@/components/ospe-simulator";
import { Navigation } from "@/components/navigation";

export default async function OspePage() {
  const session = await requireUser();

  return (
    <div className="flex flex-1">
      <Navigation
        user={{ name: session.user.name, email: session.user.email }}
        isAdmin={session.user.role === "admin"}
      />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">محاكي OSPE</h1>
            <p className="mt-1 text-muted-foreground">
              مراجعة عشوائية للمحطات العملية من معارض الصور.
            </p>
          </div>
          <OspeSimulator />
        </div>
      </main>
    </div>
  );
}
