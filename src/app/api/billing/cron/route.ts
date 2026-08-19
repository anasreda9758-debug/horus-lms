import { NextRequest, NextResponse } from "next/server";
import { processExpiredSubscriptions } from "@/features/billing/queries";

/**
 * GET /api/billing/cron
 * Run daily (via Vercel Cron or external cron job) to:
 *   1. Move expired active subscriptions to grace period
 *   2. Fully expire grace-period subscriptions past their deadline
 *
 * Protect with CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await processExpiredSubscriptions();
  return NextResponse.json({ ok: true, ...result });
}
