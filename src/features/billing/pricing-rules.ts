export const MODULE_PRICE_EGP = 149;
export const FULL_TERM_DISCOUNT_PERCENT = 20;

export type PricingProduct = {
  id: string;
  scope: string;
  scopeRef: string | null;
  moduleId?: string | null;
  academicPeriodId?: string | null;
};

export function basePriceForScope(scope: string): number | null {
  if (scope === "module") return MODULE_PRICE_EGP;
  return null;
}

export function calculateFullTermPriceCents(modulePricesCents: number[]) {
  const originalTotalCents = modulePricesCents.reduce((total, price) => total + price, 0);
  const discountCents = Math.round((originalTotalCents * FULL_TERM_DISCOUNT_PERCENT) / 100);
  return {
    originalTotalCents,
    automaticDiscountCents: discountCents,
    finalPriceCents: Math.max(0, originalTotalCents - discountCents),
  };
}

export function calculateDiscountCents(basePriceCents: number, discountType: string, discountValue: number) {
  if (discountType === "PERCENTAGE") {
    return Math.min(basePriceCents, Math.round((basePriceCents * discountValue) / 100));
  }
  return Math.min(basePriceCents, Math.max(0, discountValue * 100));
}

export function promoAppliesToProduct(
  appliesTo: string,
  product: PricingProduct,
  moduleId: string | null,
  academicPeriodId?: string | null,
) {
  return !(
    appliesTo === "FULL_TERM" && product.scope !== "term" ||
    appliesTo === "SEMESTER" && product.scope !== "term" ||
    appliesTo === "MODULE" && (product.scope !== "module" || (moduleId && moduleId !== product.moduleId)) ||
    academicPeriodId !== null && academicPeriodId !== undefined && academicPeriodId !== product.academicPeriodId
  );
}

export function promoUsageError(
  usedCount: number,
  maxUses: number | null,
  userRedemptions: number,
  maxUsesPerUser: number,
) {
  if (maxUses !== null && usedCount >= maxUses) return "CODE_USAGE_LIMIT";
  if (userRedemptions >= maxUsesPerUser) return "ALREADY_USED";
  return null;
}
