"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminSubscriptionButtons({
  userId,
  plans,
  active,
}: {
  userId: string;
  plans: { id: string; name: string; priceEg: number; durationDays: number }[];
  active: { planName: string; expiresAt: string } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "activate" | "deactivate", planId?: string) {
    setBusy(true);
    try {
      await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "activate" ? { action, userId, planId } : { action, userId },
        ),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active ? (
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
          نشط حتى {active.expiresAt.slice(0, 10)} ({active.planName})
        </span>
      ) : (
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          بدون اشتراك
        </span>
      )}
      {plans.map((p) => (
        <Button
          key={p.id}
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => act("activate", p.id)}
        >
          فعّل {p.priceEg}ج
        </Button>
      ))}
      <Button
        size="sm"
        variant="ghost"
        disabled={busy || !active}
        onClick={() => act("deactivate")}
      >
        تعطيل
      </Button>
    </div>
  );
}
