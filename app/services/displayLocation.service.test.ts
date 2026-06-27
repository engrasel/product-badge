import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "../db.server";
import { ensureDefaultLocations, listLocations, setLocationEnabled } from "./displayLocation.service";
import { setShopPremium } from "./plan.service";
import { DISPLAY_LOCATIONS } from "../utils/constants";

const shop = "vitest-fixture-locations.myshopify.com";

beforeEach(async () => {
  await prisma.displayLocation.deleteMany({ where: { shop } });
});

afterEach(async () => {
  await prisma.displayLocation.deleteMany({ where: { shop } });
});

describe("displayLocation.service", () => {
  it("seeds all locations with everything enabled except the coming-soon Cart Drawer", async () => {
    const locations = await ensureDefaultLocations(shop);
    expect(locations).toHaveLength(DISPLAY_LOCATIONS.length);

    const cartDrawer = locations.find((location) => location.key === "CART_DRAWER");
    expect(cartDrawer?.enabled).toBe(false);
    expect(locations.filter((location) => location.key !== "CART_DRAWER").every((location) => location.enabled)).toBe(
      true,
    );
  });

  it("is idempotent — calling it again doesn't duplicate rows", async () => {
    await ensureDefaultLocations(shop);
    const second = await ensureDefaultLocations(shop);
    expect(second).toHaveLength(DISPLAY_LOCATIONS.length);
  });

  it("setLocationEnabled toggles a single location without touching the others", async () => {
    await ensureDefaultLocations(shop);
    await setLocationEnabled(shop, "PRODUCT_CARDS", false);

    const locations = await listLocations(shop);
    expect(locations.find((location) => location.key === "PRODUCT_CARDS")?.enabled).toBe(false);
    expect(locations.find((location) => location.key === "COLLECTION_CARDS")?.enabled).toBe(true);
  });

  it("setLocationEnabled rejects enabling a Premium-only location on the Free plan", async () => {
    await ensureDefaultLocations(shop);
    await expect(setLocationEnabled(shop, "COLLECTION_CARDS", true)).rejects.toThrow();
    await expect(setLocationEnabled(shop, "PRODUCT_CARDS", true)).resolves.toBeDefined();

    await setShopPremium(shop, { chargeId: "test-charge" });
    await expect(setLocationEnabled(shop, "COLLECTION_CARDS", true)).resolves.toBeDefined();
  });
});
