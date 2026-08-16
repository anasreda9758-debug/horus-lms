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
  plans: {
    id: string;
    name: string;
    priceEg: number;
    durationDays: number;
    scope: string;
    scopeRef: string | null;
  }[];
  active: { planName: string; planId: string; expiresAt: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const activeIds = new Set(active.map((a) => a.planId));

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
      {active.length > 0 ? (
        active.map((a) => (
          <span
            key={a.planId}
            className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600"
          >
            {a.planName} حتى {a.expiresAt.slice(0, 10)}
          </span>
        ))
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
          disabled={busy || activeIds.has(p.id)}
          onClick={() => act("activate", p.id)}
        >
          {activeIds.has(p.id) ? "مفعّل ✓" : `فعّل ${p.name} (${p.priceEg}ج)`}
        </Button>
      ))}
      <Button
        size="sm"
        variant="ghost"
        disabled={busy || active.length === 0}
        onClick={() => act("deactivate")}
      >
        تعطيل الكل
      </Button>
    </div>
  );
}
