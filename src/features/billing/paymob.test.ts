import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyHmac } from "@/shared/paymob";

describe("Paymob HMAC verification", () => {
  const secret = "test_secret_key_123";

  function buildHmac(fields: Record<string, any>): string {
    const hmacFields = [
      "amount_cents",
      "created_at",
      "currency",
      "error_occured",
      "has_transaction",
      "id",
      "integration",
      "is_3d_secure",
      "is_auth",
      "is_capture",
      "is_refunded",
      "is_standalone_payment",
      "is_voided",
      "order",
      "owner",
      "pending",
      "source_data.type",
      "source_data.pan",
    ];

    const hmacString = hmacFields
      .map((field) => {
        const parts = field.split(".");
        let value: any = fields;
        for (const p of parts) {
          value = value?.[p];
        }
        return value !== undefined && value !== null ? String(value) : "";
      })
      .join("");

    return createHmac("sha512", secret).update(hmacString).digest("hex");
  }

  it("returns true for valid HMAC", () => {
    const body = {
      amount_cents: 11900,
      created_at: "2024-01-01T00:00:00Z",
      currency: "EGP",
      error_occured: false,
      has_transaction: true,
      id: 12345,
      integration: 678,
      is_3d_secure: false,
      is_auth: false,
      is_capture: true,
      is_refunded: false,
      is_standalone_payment: true,
      is_voided: false,
      order: { id: 999 },
      owner: 111,
      pending: false,
      source_data: { type: "card", pan: "4111" },
    };

    // Temporarily set the env var
    const original = process.env.PAYMOB_HMAC_SECRET;
    process.env.PAYMOB_HMAC_SECRET = secret;

    const bodyWithHmac = { ...body, hmac: buildHmac(body) };
    expect(verifyHmac(bodyWithHmac)).toBe(true);

    process.env.PAYMOB_HMAC_SECRET = original ?? "";
  });

  it("returns false for invalid HMAC", () => {
    const original = process.env.PAYMOB_HMAC_SECRET;
    process.env.PAYMOB_HMAC_SECRET = secret;

    const body = {
      amount_cents: 11900,
      id: 12345,
      hmac: "invalid_hmac_value",
    };
    expect(verifyHmac(body)).toBe(false);

    process.env.PAYMOB_HMAC_SECRET = original ?? "";
  });

  it("returns true when no HMAC secret configured (skip verification)", () => {
    const original = process.env.PAYMOB_HMAC_SECRET;
    process.env.PAYMOB_HMAC_SECRET = "";

    const body = { id: 123 };
    expect(verifyHmac(body)).toBe(true);

    process.env.PAYMOB_HMAC_SECRET = original ?? "";
  });
});
