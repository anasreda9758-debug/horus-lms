"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/shared/auth-client";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export function SignOutButton() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <Button
      variant="outline"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {t("Sign out", "تسجيل الخروج")}
    </Button>
  );
}
