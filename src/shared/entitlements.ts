import { isPremiumActive } from "@/features/billing/queries";

export async function hasModuleAccess(userId: string, isFree: boolean) {
  if (isFree) return true;
  return isPremiumActive(userId);
}
