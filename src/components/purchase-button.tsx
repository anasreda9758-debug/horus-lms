"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PurchaseButton({
  planId,
  priceEg,
  owned,
}: {
  planId: string;
  priceEg: number;
  owned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [preview, setPreview] = useState<{ discountAmount: number; finalPrice: number } | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  async function applyPromo() {
    setPreviewBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/price-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, promoCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreview(null);
        setError(data.error ?? "Invalid code");
        return;
      }
      setPreview(data);
    } catch {
      setError("تعذر التحقق من الكود.");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function purchase() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "حدث خطأ أثناء الاشتراك. حاول مرة أخرى.");
        return;
      }
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          placeholder="Promo code"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          aria-label="Promo code"
        />
        <Button variant="outline" onClick={applyPromo} disabled={previewBusy || !promoCode.trim()}>
          {previewBusy ? "..." : "Apply"}
        </Button>
      </div>
      {preview ? (
        <div className="rounded-lg bg-muted/50 p-2 text-xs">
          <div className="flex justify-between"><span>Original price</span><span>{priceEg.toFixed(2)} EGP</span></div>
          <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{preview.discountAmount.toFixed(2)} EGP</span></div>
          <div className="flex justify-between font-semibold"><span>Final price</span><span>{preview.finalPrice.toFixed(2)} EGP</span></div>
        </div>
      ) : null}
      <Button
        onClick={purchase}
        disabled={busy || owned}
        className="w-full"
        variant={owned ? "outline" : "default"}
      >
        {owned ? "مشترك بالفعل ✓" : busy ? "جارٍ الاشتراك..." : `اشترك الآن — ${priceEg} ج`}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
