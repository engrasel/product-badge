import prisma from "../db.server";
import { ensureShopSettings } from "./shopSettings.service";
import type { Plan } from "../utils/planLimits";

// Re-exported so server code can `import { ... } from "../services/plan.service"`
// without also reaching into utils/planLimits.ts directly. Client components
// must import planLimits.ts directly — this file pulls in db.server.ts and is
// not safe to bundle for the browser.
export * from "../utils/planLimits";

export interface ShopPlanInfo {
  plan: Plan;
  isPremium: boolean;
  subscriptionStatus: string;
  chargeId: string | null;
  currentPeriodEnd: Date | null;
}

function toPlanInfo(settings: { plan: string; subscriptionStatus: string; chargeId: string | null; currentPeriodEnd: Date | null }): ShopPlanInfo {
  const plan: Plan = settings.plan === "PREMIUM" ? "PREMIUM" : "FREE";
  return {
    plan,
    isPremium: plan === "PREMIUM",
    subscriptionStatus: settings.subscriptionStatus,
    chargeId: settings.chargeId,
    currentPeriodEnd: settings.currentPeriodEnd,
  };
}

export async function getShopPlan(shop: string): Promise<ShopPlanInfo> {
  const settings = await ensureShopSettings(shop);
  return toPlanInfo(settings);
}

export async function setShopPremium(
  shop: string,
  data: { chargeId: string; currentPeriodEnd?: Date | null },
): Promise<ShopPlanInfo> {
  const settings = await prisma.shopSettings.update({
    where: { shop },
    data: {
      plan: "PREMIUM",
      subscriptionStatus: "ACTIVE",
      chargeId: data.chargeId,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
    },
  });
  return toPlanInfo(settings);
}

export async function setShopFree(shop: string): Promise<ShopPlanInfo> {
  const settings = await prisma.shopSettings.update({
    where: { shop },
    data: {
      plan: "FREE",
      subscriptionStatus: "INACTIVE",
      chargeId: null,
      currentPeriodEnd: null,
    },
  });
  return toPlanInfo(settings);
}
