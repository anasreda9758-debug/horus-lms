import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { payment } from "@/features/billing/schema";
import { activateSubscription, GRACE_PERIOD_DAYS } from "@/features/billing/queries";
import { verifyHmac } from "@/shared/paymob";
import { logAudit } from "@/features/hierarchy/audit";

/**
 * POST /api/billing/webhook
 * Paymob sends a POST here after payment is completed (success or failure).
 *
 * We verify the HMAC, then:
 *   - If success (is_transaction=true, error_occured=false): mark payment paid + activate subscription
 *   - Otherwise: mark payment failed
 */
export async function POST(request: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Verify HMAC
  const hmacValid = await verifyHmac(body);
  if (!hmacValid) {
    console.error("[webhook] HMAC verification failed");
    return NextResponse.json({ error: "invalid hmac" }, { status: 403 });
  }

  // Paymob sends the payment ID in `id` and success via `success` + `is_transaction`
  const paymobTransactionId = String(body.id);
  const success = body.success === true || body.success === "true";
  const isTransaction = body.is_transaction === true || body.is_transaction === "true";
  const errorOccured = body.error_occured === true || body.error_occured === "true";
  const paymentMethod = body.source_data?.type ?? "card";

  // Find the payment by paymob_order_id or paymob_transaction_id
  const paymentRow = await db.query.payment.findFirst({
    where: (p, { or, eq }) =>
      or(
        eq(p.paymobOrderId, String(body.order?.id ?? "")),
        eq(p.paymobTransactionId, paymobTransactionId),
      ),
  });

  if (!paymentRow) {
    console.error("[webhook] Payment not found for order:", body.order?.id);
    return NextResponse.json({ ok: true }); // return 200 so Paymob doesn't retry
  }

  if (paymentRow.status === "paid") {
    return NextResponse.json({ ok: true, message: "already processed" });
  }

  if (success && isTransaction && !errorOccured) {
    // Mark payment as paid
    await db
      .update(payment)
      .set({
        status: "paid",
        paymobTransactionId,
        paymentMethod,
        paidAt: new Date(),
      })
      .where(eq(payment.id, paymentRow.id));

    // Activate subscription
    const activated = await activateSubscription(
      paymentRow.userId,
      paymentRow.planId,
    );

    if (activated) {
      await logAudit({
        userId: paymentRow.userId,
        userName: "system",
        action: "payment",
        entityType: "subscription",
        entityId: paymentRow.id,
        entityName: activated.name,
        newData: {
          planId: paymentRow.planId,
          amountEg: paymentRow.amountEg,
          paymentMethod,
          paymobTransactionId,
        },
      });
    }
  } else {
    // Mark as failed
    await db
      .update(payment)
      .set({ status: "failed", paymentMethod })
      .where(eq(payment.id, paymentRow.id));
  }

  return NextResponse.json({ ok: true });
}
