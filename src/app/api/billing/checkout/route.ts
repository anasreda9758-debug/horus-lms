import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { payment, plan } from "@/features/billing/schema";
import { authenticate, createOrder, getPaymentKey, getIframeUrl } from "@/shared/paymob";
import { eq } from "drizzle-orm";

/**
 * POST /api/billing/checkout
 * Creates a Paymob order and returns the iframe URL for the client to redirect to.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let planId: string;
  try {
    const body = await request.json();
    if (typeof body.planId !== "string" || body.planId.length === 0) {
      return NextResponse.json({ error: "invalid planId" }, { status: 400 });
    }
    planId = body.planId;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Find the plan
  const planRow = await db.query.plan.findFirst({ where: eq(plan.id, planId) });
  if (!planRow) {
    return NextResponse.json({ error: "plan not found" }, { status: 404 });
  }

  const amountCents = planRow.priceEg * 100;

  // Create internal payment record
  const paymentId = randomUUID();
  await db.insert(payment).values({
    id: paymentId,
    userId: session.user.id,
    planId,
    amountEg: planRow.priceEg,
    status: "pending",
  });

  try {
    // Step 1: Authenticate with Paymob
    const authToken = await authenticate();

    // Step 2: Create Paymob order
    const paymobOrder = await createOrder({
      authToken,
      amountCents,
      orderId: paymentId,
    });

    // Step 3: Get payment key
    const nameParts = (session.user.name ?? "User User").split(" ");
    const firstName = nameParts[0] ?? "User";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const paymentKey = await getPaymentKey({
      authToken,
      orderId: paymobOrder.id,
      amountCents,
      billingData: {
        first_name: firstName,
        last_name: lastName,
        email: session.user.email ?? "",
      },
    });

    // Update payment record with Paymob IDs
    await db
      .update(payment)
      .set({ paymobOrderId: String(paymobOrder.id), paymobPaymentKey: paymentKey })
      .where(eq(payment.id, paymentId));

    // Return iframe URL
    const iframeUrl = getIframeUrl(paymentKey);
    return NextResponse.json({ ok: true, iframeUrl, paymentId });
  } catch (err) {
    console.error("[checkout] Paymob error:", err);
    await db
      .update(payment)
      .set({ status: "failed" })
      .where(eq(payment.id, paymentId));
    return NextResponse.json(
      { error: "payment gateway error" },
      { status: 502 },
    );
  }
}
