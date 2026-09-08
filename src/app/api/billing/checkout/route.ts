import { NextResponse } from "next/server";
import { getSession } from "@/shared/session";

/**
 * Paymob checkout is deliberately disabled. Do not create payment records,
 * payment keys, or outbound gateway calls until the live payment review is
 * explicitly authorized.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "payments are not active" }, { status: 503 });
}
