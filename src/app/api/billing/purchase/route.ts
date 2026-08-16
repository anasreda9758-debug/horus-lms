import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { activateSubscription } from "@/features/billing/queries";

// Purchase flow for the pricing page.
//
// NOTE: No real payment gateway is wired yet — the owner plans to integrate one
// after the platform is finished. For now this endpoint simulates a successful
// payment and immediately activates the subscription. Swap the commented block
// below for the gateway integration later (create order -> redirect -> verify webhook).
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

  // TODO(gateway): create a payment intent / order here and return a redirect URL.
  // The subscription below must only be activated after the payment is confirmed
  // (webhook), not before.

  const activated = await activateSubscription(session.user.id, planId);
  if (!activated) {
    return NextResponse.json({ error: "plan not found" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, plan: { id: activated.id, name: activated.name } });
}
