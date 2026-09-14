import { describe, expect, it } from "vitest";
import {
  MODULE_PRICE_EGP,
  SEMESTER_PRICE_EGP,
  calculateDiscountCents,
  basePriceForScope,
  promoAppliesToProduct,
  promoUsageError,
} from "./pricing-rules";

describe("VYLO pricing and promo rules", () => {
  it("uses the VYLO module and semester prices", () => {
    expect(MODULE_PRICE_EGP).toBe(149);
    expect(SEMESTER_PRICE_EGP).toBe(449);
    expect(basePriceForScope("module")).toBe(149);
    expect(basePriceForScope("term")).toBe(449);
  });

  it("calculates VYLOSTART at 20 percent", () => {
    expect(calculateDiscountCents(44900, "PERCENTAGE", 20)).toBe(8980);
  });

  it("calculates VYLOSEM50 at 50 EGP for a semester", () => {
    expect(calculateDiscountCents(44900, "FIXED_EGP", 50)).toBe(5000);
    expect(promoAppliesToProduct("SEMESTER", { id: "term-1", scope: "term", scopeRef: "1" }, null)).toBe(true);
    expect(promoAppliesToProduct("SEMESTER", { id: "module-1", scope: "module", scopeRef: "m1" }, null)).toBe(false);
  });

  it("supports module-specific codes and rejects other modules", () => {
    expect(promoAppliesToProduct("MODULE", { id: "module-1", scope: "module", scopeRef: "m1", moduleId: "m1" }, "m1")).toBe(true);
    expect(promoAppliesToProduct("MODULE", { id: "module-2", scope: "module", scopeRef: "m2", moduleId: "m2" }, "m1")).toBe(false);
  });

  it("never produces a negative final price", () => {
    const discount = calculateDiscountCents(1000, "FIXED_EGP", 50);
    expect(Math.max(0, 1000 - discount)).toBe(0);
    expect(calculateDiscountCents(1000, "PERCENTAGE", 100)).toBe(1000);
  });

  it("enforces inactive/expired and usage decisions without consuming a preview", () => {
    expect(promoUsageError(100, 100, 0, 1)).toBe("CODE_USAGE_LIMIT");
    expect(promoUsageError(1, 100, 1, 1)).toBe("ALREADY_USED");
    expect(promoUsageError(1, 100, 0, 1)).toBeNull();
    expect(promoUsageError(0, null, 0, 1)).toBeNull();
  });
});
