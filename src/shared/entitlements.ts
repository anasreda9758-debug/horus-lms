import { hasModuleAccess, hasAnySubscription } from "@/features/billing/queries";

export async function hasModuleAccessForUser(
  userId: string,
  module: { id: string; slug: string; isFree: boolean; term: number },
) {
  return hasModuleAccess(userId, module);
}

export { hasModuleAccess, hasAnySubscription };
