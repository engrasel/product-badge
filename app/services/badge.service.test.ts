import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "../db.server";
import {
  createBadgeFromTemplate,
  createCustomBadge,
  deleteBadge,
  ensureDefaultBadge,
  getBadge,
  listBadges,
  updateBadge,
} from "./badge.service";
import { setShopFree, setShopPremium } from "./plan.service";

// Runs against the real dev database (no separate test DB is set up yet — a
// Phase 12 candidate), isolated to a dedicated fixture shop with cleanup
// before/after every test so it never touches real merchant data.
const shop = "vitest-fixture-badges.myshopify.com";
const otherShop = "vitest-fixture-other.myshopify.com";

beforeEach(async () => {
  await prisma.badge.deleteMany({ where: { shop: { in: [shop, otherShop] } } });
  await setShopFree(shop);
});

afterEach(async () => {
  await prisma.badge.deleteMany({ where: { shop: { in: [shop, otherShop] } } });
});

describe("badge.service", () => {
  it("ensureDefaultBadge seeds exactly one Sale badge with a Discount Products rule, and is idempotent", async () => {
    await ensureDefaultBadge(shop);
    let badges = await listBadges(shop);
    expect(badges).toHaveLength(1);
    expect(badges[0].templateKey).toBe("sale");
    expect(badges[0].text).toBe("SALE");
    expect(badges[0].rules).toHaveLength(1);
    expect(badges[0].rules[0].type).toBe("DISCOUNT_PRODUCTS");

    await ensureDefaultBadge(shop);
    badges = await listBadges(shop);
    expect(badges).toHaveLength(1);
  });

  it("createBadgeFromTemplate copies the template's style fields", async () => {
    const badge = await createBadgeFromTemplate(shop, "new");
    expect(badge.text).toBe("NEW");
    expect(badge.shape).toBe("ROUNDED");
    expect(badge.backgroundColor).toBe("#34C759");
    expect(badge.rules).toHaveLength(0);
  });

  it("createBadgeFromTemplate rejects Premium templates and unknown keys on the Free plan", async () => {
    await expect(createBadgeFromTemplate(shop, "best-seller")).rejects.toThrow();
    await expect(createBadgeFromTemplate(shop, "not-a-real-key")).rejects.toThrow();
  });

  it("createBadgeFromTemplate allows Premium templates once the shop is Premium", async () => {
    await setShopPremium(shop, { chargeId: "test-charge" });
    const badge = await createBadgeFromTemplate(shop, "best-seller");
    expect(badge.templateKey).toBe("best-seller");
  });

  it("createBadgeFromTemplate enforces the 2 active badge limit on the Free plan", async () => {
    await createBadgeFromTemplate(shop, "sale");
    await createBadgeFromTemplate(shop, "new");
    await expect(createBadgeFromTemplate(shop, "sale")).rejects.toThrow();
  });

  it("createCustomBadge is Premium-only", async () => {
    await expect(createCustomBadge(shop)).rejects.toThrow();

    await setShopPremium(shop, { chargeId: "test-charge" });
    const badge = await createCustomBadge(shop);
    expect(badge.templateKey).toBe("custom");
    expect(badge.text).toBe("BADGE");
    expect(badge.backgroundColor).toBe("#FF3B30");
  });

  it("updateBadge writes changes and rejects badges that don't belong to the shop", async () => {
    await setShopPremium(shop, { chargeId: "test-charge" });
    const badge = await createCustomBadge(shop);
    const updated = await updateBadge(shop, badge.id, { text: "WOW" });
    expect(updated.text).toBe("WOW");

    await expect(updateBadge(otherShop, badge.id, { text: "HACKED" })).rejects.toThrow();

    const reread = await getBadge(shop, badge.id);
    expect(reread?.text).toBe("WOW");
  });

  it("updateBadge strips Premium-only fields back to free-plan defaults for a Free shop", async () => {
    const badge = await createBadgeFromTemplate(shop, "sale");
    const updated = await updateBadge(shop, badge.id, {
      backgroundType: "GRADIENT",
      gradientColor1: "#000000",
      gradientColor2: "#FFFFFF",
      shape: "PILL",
      animation: "BOUNCE",
      priority: 5,
      customCssCode: ".x { color: red }",
      displayLocations: JSON.stringify(["PRODUCT_CARDS", "CART_DRAWER"]),
    });

    expect(updated.backgroundType).toBe("SOLID");
    expect(updated.gradientColor1).toBeNull();
    expect(updated.shape).toBe("RIBBON");
    expect(updated.animation).toBe("NONE");
    expect(updated.priority).toBe(0);
    expect(updated.customCssCode).toBeNull();
    expect(JSON.parse(updated.displayLocations!)).toEqual(["PRODUCT_CARDS"]);
  });

  it("deleteBadge removes the badge and is scoped to the given shop", async () => {
    const badge = await createBadgeFromTemplate(shop, "sale");

    await deleteBadge(otherShop, badge.id);
    expect(await getBadge(shop, badge.id)).not.toBeNull();

    await deleteBadge(shop, badge.id);
    expect(await getBadge(shop, badge.id)).toBeNull();
  });
});
