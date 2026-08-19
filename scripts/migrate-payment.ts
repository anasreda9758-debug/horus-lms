/**
 * Migration: Add payment table, grace period columns to subscription.
 * Run with: npx tsx scripts/migrate-payment.ts
 */
import { randomUUID } from "node:crypto";

async function main() {
  const postgres = (await import("postgres")).default;
  const sql = postgres("postgres://postgres:lms_dev@localhost:5432/lms", { max: 1 });

  console.log("[migration] Creating payment table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS payment (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE RESTRICT,
      amount_eg INTEGER NOT NULL,
      paymob_order_id TEXT,
      paymob_payment_key TEXT,
      paymob_transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS payment_user_idx ON payment(user_id);
    CREATE INDEX IF NOT EXISTS payment_status_idx ON payment(status);
  `);
  console.log("[migration] Payment table created.");

  console.log("[migration] Adding grace_expires_at to subscription...");
  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TABLE subscription ADD COLUMN grace_expires_at TIMESTAMP;
    EXCEPTION
      WHEN duplicate_column THEN NULL;
    END $$;
  `);
  console.log("[migration] Grace period column added.");

  console.log("[migration] Done!");
  await sql.end();
}

main().catch((e) => {
  console.error("[migration] FAILED:", e);
  process.exit(1);
});
