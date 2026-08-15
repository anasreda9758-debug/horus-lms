import Link from "next/link";
import { requireUser } from "@/shared/session";
import { buttonVariants } from "@/components/ui/button";
import { OspeSimulator } from "@/components/ospe-simulator";

export default async function OspePage() {
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🔬 محاكي OSPE</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مراجعة عشوائية للمحطات العملية من معارض الصور.
          </p>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          لوحة الطالب
        </Link>
      </div>

      <OspeSimulator />
    </main>
  );
}
