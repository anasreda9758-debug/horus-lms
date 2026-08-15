"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CompleteButton({
  lectureId,
  moduleSlug,
  completed,
}: {
  lectureId: string;
  moduleSlug: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await fetch("/api/curriculum/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lectureId, moduleSlug }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={completed ? "outline" : "default"} disabled={busy} onClick={onClick}>
      {completed ? "إلغاء الإكمال" : "وضع علامة كمكتمل"}
    </Button>
  );
}
