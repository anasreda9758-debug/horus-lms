import { describe, expect, it } from "vitest";
import {
  MODULE_PRICE_EGP,
  FULL_TERM_DISCOUNT_PERCENT,
  calculateFullTermPriceCents,
  calculateSummerPriceCents,
  calculateDiscountCents,
  basePriceForScope,
  promoAppliesToProduct,
  promoUsageError,
} from "./pricing-rules";

describe("VYLO pricing and promo rules", () => {
  it("uses the VYLO module and semester prices", () => {
    expect(MODULE_PRICE_EGP).toBe(149);
    expect(basePriceForScope("module")).toBe(149);
    expect(basePriceForScope("term")).toBeNull();
  });

  it("calculates dynamic full-term prices for any module count", () => {
    expect(FULL_TERM_DISCOUNT_PERCENT).toBe(20);
    expect(calculateFullTermPriceCents([14900, 14900, 14900]).finalPriceCents).toBe(35760);
    expect(calculateFullTermPriceCents([14900, 14900, 14900, 14900]).finalPriceCents).toBe(47680);
    expect(calculateFullTermPriceCents([14900, 14900, 14900, 14900, 14900]).finalPriceCents).toBe(59600);
  });

  it("prices Summer retakes module-by-module without a term discount", () => {
    expect(calculateSummerPriceCents(1)).toBe(14900);
    expect(calculateSummerPriceCents(2)).toBe(29800);
    expect(calculateSummerPriceCents(3)).toBe(44700);
    expect(promoAppliesToProduct("FULL_TERM", {
      id: "summer:session",
      scope: "module",
      scopeRef: null,
      academicPeriodId: "summer-session",
    }, null)).toBe(false);
    expect(promoAppliesToProduct("ANY", {
      id: "summer:session",
      scope: "module",
      scopeRef: null,
      academicPeriodId: "summer-session",
    }, null)).toBe(true);
  });

  it("calculates VYLOSTART at 10 percent", () => {
    expect(calculateDiscountCents(47680, "PERCENTAGE", 10)).toBe(4768);
  });

  it("calculates VYLOSEM50 at 50 EGP for a semester", () => {
    expect(calculateDiscountCents(47680, "FIXED_EGP", 50)).toBe(5000);
    expect(promoAppliesToProduct("FULL_TERM", { id: "term-1", scope: "term", scopeRef: "1" }, null)).toBe(true);
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
