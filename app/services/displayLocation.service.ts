import prisma from "../db.server";
import { DISPLAY_LOCATIONS } from "../utils/constants";
import { getShopPlan } from "./plan.service";
import { canUseLocation } from "../utils/planLimits";
import type { DisplayLocationKey } from "../types/locations.types";

export async function listLocations(shop: string) {
  return prisma.displayLocation.findMany({ where: { shop } });
}

// Backfills any locations a shop doesn't have a toggle row for yet — runs once
// per shop (no-ops once all rows exist), so new location keys added later are
// picked up automatically without a manual migration script.
export async function ensureDefaultLocations(shop: string) {
  const existing = await listLocations(shop);
  const existingKeys = new Set(existing.map((location) => location.key));
  const missing = DISPLAY_LOCATIONS.filter(
    (location) => !existingKeys.has(location.value),
  );

  if (missing.length === 0) {
    return existing;
  }

  await prisma.$transaction(
    missing.map((location) =>
      prisma.displayLocation.create({
        data: {
          shop,
          key: location.value,
          enabled: !location.comingSoon,
        },
      }),
    ),
  );

  return listLocations(shop);
}

export async function setLocationEnabled(
  shop: string,
  key: string,
  enabled: boolean,
) {
  if (enabled) {
    const { plan } = await getShopPlan(shop);
    if (!canUseLocation(plan, key as DisplayLocationKey)) {
      throw new Error(`"${key}" is a Premium display location and cannot be enabled on the Free plan`);
    }
  }

  return prisma.displayLocation.update({
    where: { shop_key: { shop, key } },
    data: { enabled },
  });
}
