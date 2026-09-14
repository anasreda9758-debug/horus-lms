import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { curriculumModule } from "../curriculum/schema";
import { academicPeriod } from "../hierarchy/schema";
import { promoCode, promoRedemption, plan } from "./schema";
import {
  MODULE_PRICE_EGP,
  FULL_TERM_DISCOUNT_PERCENT,
  basePriceForScope,
  calculateDiscountCents,
  calculateFullTermPriceCents,
  promoAppliesToProduct,
  promoUsageError,
  type PricingProduct,
} from "./pricing-rules";

export { MODULE_PRICE_EGP, FULL_TERM_DISCOUNT_PERCENT, basePriceForScope, calculateDiscountCents, calculateFullTermPriceCents, promoAppliesToProduct, promoUsageError };

export type PromoErrorCode =
  | "INVALID_CODE"
  | "CODE_EXPIRED"
  | "CODE_NOT_ACTIVE"
  | "CODE_USAGE_LIMIT"
  | "ALREADY_USED"
  | "CODE_NOT_VALID_FOR_PRODUCT";

export class PromoValidationError extends Error {
  constructor(public readonly code: PromoErrorCode) {
    super(code);
  }
}

type PromoRecord = Pick<
  typeof promoCode.$inferSelect,
  | "id"
  | "code"
  | "description"
  | "discountType"
  | "discountValue"
  | "appliesTo"
  | "moduleId"
  | "academicPeriodId"
  | "active"
  | "startsAt"
  | "expiresAt"
  | "maxUses"
  | "usedCount"
  | "maxUsesPerUser"
>;

export async function calculatePricePreview(input: {
  planId: string;
  promoCodeText?: string;
  userId?: string;
}) {
  const selectedPlan = await db.query.plan.findFirst({
    where: and(eq(plan.id, input.planId), eq(plan.active, true)),
  });
  if (!selectedPlan) throw new Error("PLAN_NOT_FOUND");

  if (selectedPlan.scope === "year") throw new Error("PRODUCT_NOT_AVAILABLE");
  const periodType = selectedPlan.scope === "term"
    ? selectedPlan.scopeRef === "1" ? "TERM_1" : selectedPlan.scopeRef === "2" ? "TERM_2" : null
    : null;
  let period: typeof academicPeriod.$inferSelect | undefined;
  let moduleCount = 1;
  let basePriceCents = MODULE_PRICE_EGP * 100;
  const product: PricingProduct = {
    id: selectedPlan.id,
    scope: selectedPlan.scope,
    scopeRef: selectedPlan.scopeRef,
  };
  if (selectedPlan.scope === "module" && selectedPlan.scopeRef) {
    const moduleRow = await db.query.curriculumModule.findFirst({
      where: eq(curriculumModule.slug, selectedPlan.scopeRef),
      with: { academicPeriod: true },
    });
    product.moduleId = moduleRow?.id ?? null;
    period = moduleRow?.academicPeriod ?? undefined;
  } else if (periodType) {
    period = await db.query.academicPeriod.findFirst({
      where: and(eq(academicPeriod.type, periodType), eq(academicPeriod.active, true)),
    });
    if (period) {
      const periodModules = await db.query.curriculumModule.findMany({
        where: eq(curriculumModule.academicPeriodId, period.id),
        columns: { id: true },
      });
      moduleCount = periodModules.length;
      basePriceCents = calculateFullTermPriceCents(
        Array.from({ length: moduleCount }, () => MODULE_PRICE_EGP * 100),
      ).finalPriceCents;
    }
  }
  if (!period) throw new Error("ACADEMIC_PERIOD_NOT_CONFIGURED");
  product.academicPeriodId = period.id;
  let discountAmountCents = 0;
  let promo: typeof promoCode.$inferSelect | null = null;

  if (input.promoCodeText?.trim()) {
    promo = await db.query.promoCode.findFirst({
      where: eq(promoCode.code, input.promoCodeText.trim().toUpperCase()),
    }) ?? null;
    if (!promo) throw new PromoValidationError("INVALID_CODE");
    await validatePromo(promo, product, input.userId);
    discountAmountCents = calculateDiscountCents(
      basePriceCents,
      promo.discountType,
      promo.discountValue,
    );
  }

  const finalPriceCents = Math.max(0, basePriceCents - discountAmountCents);
  return {
    planId: selectedPlan.id,
    originalPrice: (moduleCount * MODULE_PRICE_EGP),
    automaticDiscount: selectedPlan.scope === "term"
      ? (moduleCount * MODULE_PRICE_EGP * FULL_TERM_DISCOUNT_PERCENT) / 100
      : 0,
    basePrice: basePriceCents / 100,
    discountAmount: discountAmountCents / 100,
    finalPrice: finalPriceCents / 100,
    basePriceCents,
    discountAmountCents,
    finalPriceCents,
    promoCode: promo?.code ?? null,
    expiresAt: period.endsAt,
  };
}

async function validatePromo(
  promo: PromoRecord,
  product: PricingProduct,
  userId?: string,
) {
  const now = new Date();
  if (!promo.active) throw new PromoValidationError("CODE_NOT_ACTIVE");
  if (promo.startsAt && promo.startsAt > now) throw new PromoValidationError("CODE_NOT_ACTIVE");
  if (promo.expiresAt && promo.expiresAt <= now) throw new PromoValidationError("CODE_EXPIRED");
  const usageError = promoUsageError(promo.usedCount, promo.maxUses, 0, promo.maxUsesPerUser);
  if (usageError) throw new PromoValidationError(usageError);
  if (!promoAppliesToProduct(promo.appliesTo, product, promo.moduleId, promo.academicPeriodId)) {
    throw new PromoValidationError("CODE_NOT_VALID_FOR_PRODUCT");
  }
  if (userId) {
    const redemptions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(promoRedemption)
      .where(and(eq(promoRedemption.promoCodeId, promo.id), eq(promoRedemption.userId, userId)));
    const usageError = promoUsageError(promo.usedCount, promo.maxUses, redemptions[0]?.count ?? 0, promo.maxUsesPerUser);
    if (usageError) throw new PromoValidationError(usageError);
  }
}

/**
 * Consume a code only after the payment/access transaction has succeeded.
 * The row lock and redemption check make max-use enforcement atomic.
 */
export async function redeemPromoCode(input: {
  code: string;
  userId: string;
  planId: string;
  paymentId?: string;
}) {
  return db.transaction(async (tx) => {
    const promoRows = await tx.execute(
      sql`SELECT * FROM "promo_code" WHERE code = ${input.code.trim().toUpperCase()} FOR UPDATE`,
    );
    const rawPromo = promoRows[0] as {
      id: string;
      code: string;
      description: string | null;
      discount_type: string;
      discount_value: number;
      applies_to: string;
      module_id: string | null;
      active: boolean;
      starts_at: Date | null;
      expires_at: Date | null;
      max_uses: number | null;
      used_count: number;
      max_uses_per_user: number;
      academic_period_id: string | null;
    } | undefined;
    const promo = rawPromo ? {
      id: rawPromo.id,
      code: rawPromo.code,
      description: rawPromo.description,
      discountType: rawPromo.discount_type,
      discountValue: rawPromo.discount_value,
      appliesTo: rawPromo.applies_to,
      moduleId: rawPromo.module_id,
      active: rawPromo.active,
      startsAt: rawPromo.starts_at,
      expiresAt: rawPromo.expires_at,
      maxUses: rawPromo.max_uses,
      usedCount: rawPromo.used_count,
      maxUsesPerUser: rawPromo.max_uses_per_user,
      academicPeriodId: rawPromo.academic_period_id,
    } : undefined;
    if (!promo) throw new PromoValidationError("INVALID_CODE");

    const selectedPlan = await tx.query.plan.findFirst({ where: eq(plan.id, input.planId) });
    if (!selectedPlan) throw new Error("PLAN_NOT_FOUND");
    if (selectedPlan.scope === "year") throw new Error("PRODUCT_NOT_AVAILABLE");
    const product: PricingProduct = { id: selectedPlan.id, scope: selectedPlan.scope, scopeRef: selectedPlan.scopeRef };
    let redemptionPriceCents = MODULE_PRICE_EGP * 100;
    if (selectedPlan.scope === "module" && selectedPlan.scopeRef) {
      const moduleRow = await tx.query.curriculumModule.findFirst({
        where: eq(curriculumModule.slug, selectedPlan.scopeRef),
        with: { academicPeriod: true },
      });
      product.moduleId = moduleRow?.id ?? null;
      product.academicPeriodId = moduleRow?.academicPeriod?.id ?? null;
    } else if (selectedPlan.scope === "term") {
      const type = selectedPlan.scopeRef === "1" ? "TERM_1" : "TERM_2";
      const period = await tx.query.academicPeriod.findFirst({
        where: and(eq(academicPeriod.type, type), eq(academicPeriod.active, true)),
      });
      if (!period) throw new Error("ACADEMIC_PERIOD_NOT_CONFIGURED");
      product.academicPeriodId = period.id;
      const periodModules = await tx.query.curriculumModule.findMany({
        where: eq(curriculumModule.academicPeriodId, period.id),
        columns: { id: true },
      });
      redemptionPriceCents = calculateFullTermPriceCents(
        Array.from({ length: periodModules.length }, () => MODULE_PRICE_EGP * 100),
      ).finalPriceCents;
    }
    await validatePromoWithTx(tx, promo, product, input.userId);
    const discountAmountCents = calculateDiscountCents(redemptionPriceCents, promo.discountType, promo.discountValue);

    await tx.insert(promoRedemption).values({
      id: randomUUID(),
      promoCodeId: promo.id,
      userId: input.userId,
      paymentId: input.paymentId,
      discountAmountCents,
    });
    await tx.update(promoCode).set({ usedCount: sql`${promoCode.usedCount} + 1` }).where(eq(promoCode.id, promo.id));
    return { discountAmountCents, finalPriceCents: Math.max(0, redemptionPriceCents - discountAmountCents) };
  });
}

async function validatePromoWithTx(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], promo: PromoRecord, product: PricingProduct, userId: string) {
  const now = new Date();
  if (!promo.active) throw new PromoValidationError("CODE_NOT_ACTIVE");
  if (promo.startsAt && promo.startsAt > now) throw new PromoValidationError("CODE_NOT_ACTIVE");
  if (promo.expiresAt && promo.expiresAt <= now) throw new PromoValidationError("CODE_EXPIRED");
  const result = await tx.execute(sql`SELECT count(*)::int AS count FROM "promo_redemption" WHERE promo_code_id = ${promo.id} AND user_id = ${userId}`);
  const usageError = promoUsageError(promo.usedCount, promo.maxUses, Number((result[0] as { count: number }).count), promo.maxUsesPerUser);
  if (usageError) throw new PromoValidationError(usageError);
  if (!promoAppliesToProduct(promo.appliesTo, product, promo.moduleId, promo.academicPeriodId)) {
    throw new PromoValidationError("CODE_NOT_VALID_FOR_PRODUCT");
  }
}
