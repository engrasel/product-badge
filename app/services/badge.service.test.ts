import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "../db.server";
import {
  createBadgeFromTemplate,
  createCustomBadge,
  deleteBadge,
  duplicateBadge,
  ensureDefaultBadge,
  getBadge,
  listBadges,
  setBadgeArchived,
  updateBadge,
} from "./badge.service";
import { createRule } from "./displayRule.service";

// Runs against the real dev database (no separate test DB is set up yet — a
// Phase 12 candidate), isolated to a dedicated fixture shop with cleanup
// before/after every test so it never touches real merchant data.
const shop = "vitest-fixture-badges.myshopify.com";
const otherShop = "vitest-fixture-other.myshopify.com";

beforeEach(async () => {
  await prisma.badge.deleteMany({ where: { shop: { in: [shop, otherShop] } } });
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

  it("createBadgeFromTemplate rejects unknown keys", async () => {
    await expect(createBadgeFromTemplate(shop, "not-a-real-key")).rejects.toThrow();
  });

  it("createBadgeFromTemplate works for every template, including former Premium ones", async () => {
    const badge = await createBadgeFromTemplate(shop, "best-seller");
    expect(badge.templateKey).toBe("best-seller");
  });

  it("createCustomBadge creates a blank custom badge", async () => {
    const badge = await createCustomBadge(shop);
    expect(badge.templateKey).toBe("custom");
    expect(badge.text).toBe("BADGE");
    expect(badge.backgroundColor).toBe("#FF3B30");
  });

  it("updateBadge writes changes and rejects badges that don't belong to the shop", async () => {
    const badge = await createCustomBadge(shop);
    const updated = await updateBadge(shop, badge.id, { text: "WOW" });
    expect(updated.text).toBe("WOW");

    await expect(updateBadge(otherShop, badge.id, { text: "HACKED" })).rejects.toThrow();

    const reread = await getBadge(shop, badge.id);
    expect(reread?.text).toBe("WOW");
  });

  it("deleteBadge removes the badge and is scoped to the given shop", async () => {
    const badge = await createBadgeFromTemplate(shop, "sale");

    await deleteBadge(otherShop, badge.id);
    expect(await getBadge(shop, badge.id)).not.toBeNull();

    await deleteBadge(shop, badge.id);
    expect(await getBadge(shop, badge.id)).toBeNull();
  });

  it("setBadgeArchived archives a badge and listBadges excludes it by default", async () => {
    const badge = await createBadgeFromTemplate(shop, "sale");
    await setBadgeArchived(shop, badge.id, true);

    expect(await listBadges(shop)).toHaveLength(0);
    expect(await listBadges(shop, { includeArchived: true })).toHaveLength(1);

    await setBadgeArchived(shop, badge.id, false);
    expect(await listBadges(shop)).toHaveLength(1);
  });

  it("duplicateBadge clones style fields and rules into a new badge", async () => {
    const badge = await createBadgeFromTemplate(shop, "sale");
    await createRule(shop, badge.id, "PRODUCT_TAGS", { tags: ["sale"] });

    const copy = await duplicateBadge(shop, badge.id);

    expect(copy.id).not.toBe(badge.id);
    expect(copy.name).toBe(`${badge.name} (Copy)`);
    expect(copy.text).toBe(badge.text);
    expect(copy.backgroundColor).toBe(badge.backgroundColor);
    expect(copy.isArchived).toBe(false);
    expect(copy.rules).toHaveLength(1);
    expect(copy.rules[0].type).toBe("PRODUCT_TAGS");
  });
});
