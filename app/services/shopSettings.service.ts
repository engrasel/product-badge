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

export async function setShopLanguage(shop: string, language: string) {
  return prisma.shopSettings.update({
    where: { shop },
    data: { language },
  });
}

export async function setShopTimezone(shop: string, timezone: string | null) {
  return prisma.shopSettings.update({
    where: { shop },
    data: { timezone },
  });
}

export async function resetShopSettings(shop: string) {
  return prisma.shopSettings.update({
    where: { shop },
    data: { isEnabled: true, language: "en", timezone: null },
  });
}
