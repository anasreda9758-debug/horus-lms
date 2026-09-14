export const MODULE_PRICE_EGP = 149;
export const SEMESTER_PRICE_EGP = 449;

export type PricingProduct = {
  id: string;
  scope: string;
  scopeRef: string | null;
  moduleId?: string | null;
};

export function basePriceForScope(scope: string): number | null {
  if (scope === "module") return MODULE_PRICE_EGP;
  if (scope === "term") return SEMESTER_PRICE_EGP;
  return null;
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
) {
  return !(
    appliesTo === "SEMESTER" && product.scope !== "term" ||
    appliesTo === "MODULE" && (product.scope !== "module" || (moduleId && moduleId !== product.moduleId))
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
