import prisma from "../db.server";

// Get-or-create the per-shop settings row. Safe to call on every request.
export async function ensureShopSettings(shop: string) {
  return prisma.shopSettings.upsert({
    where: { shop },
    update: {},
    create: { shop },
  });
}

export async function setShopEnabled(shop: string, isEnabled: boolean) {
  return prisma.shopSettings.update({
    where: { shop },
    data: { isEnabled },
  });
}
