import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { sql } from "drizzle-orm";

export async function GET() {
  let dbOk = false;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return NextResponse.json(
    { ok: dbOk, db: dbOk, ts: new Date().toISOString() },
    { status: dbOk ? 200 : 503 },
  );
}
