import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "../db.server";
import { createCustomBadge } from "./badge.service";
import { createRule, deleteRule, setBadgeMatchType, updateRuleValue } from "./displayRule.service";

const shop = "vitest-fixture-rules.myshopify.com";
const otherShop = "vitest-fixture-rules-other.myshopify.com";

beforeEach(async () => {
  await prisma.badge.deleteMany({ where: { shop: { in: [shop, otherShop] } } });
});

afterEach(async () => {
  await prisma.badge.deleteMany({ where: { shop: { in: [shop, otherShop] } } });
});

describe("displayRule.service", () => {
  it("createRule always creates a new row, even for an existing type", async () => {
    const badge = await createCustomBadge(shop);
    await createRule(shop, badge.id, "PRODUCT_TAGS", { tags: ["sale"] });
    await createRule(shop, badge.id, "PRODUCT_TAGS", { tags: ["summer"] });

    const rules = await prisma.displayRule.findMany({ where: { badgeId: badge.id } });
    expect(rules).toHaveLength(2);
    expect(rules.map((rule) => JSON.parse(rule.value!).tags).flat().sort()).toEqual(["sale", "summer"]);
  });

  it("createRule allows multiple different rule types on the same badge", async () => {
    const badge = await createCustomBadge(shop);
    await createRule(shop, badge.id, "PRODUCT_TAGS", { tags: ["sale"] });
    await createRule(shop, badge.id, "VENDOR", { vendors: ["Acme"] });

    const rules = await prisma.displayRule.findMany({ where: { badgeId: badge.id } });
    expect(rules.map((rule) => rule.type).sort()).toEqual(["PRODUCT_TAGS", "VENDOR"]);
  });

  it("createRule rejects badges that don't belong to the given shop", async () => {
    const badge = await createCustomBadge(shop);
    await expect(createRule(otherShop, badge.id, "ALL_PRODUCTS")).rejects.toThrow();
  });

  it("updateRuleValue overwrites an existing rule's value without creating a new row", async () => {
    const badge = await createCustomBadge(shop);
    const rule = await createRule(shop, badge.id, "PRODUCT_TAGS", { tags: ["sale"] });
    await updateRuleValue(shop, rule.id, { tags: ["sale", "summer"] });

    const rules = await prisma.displayRule.findMany({ where: { badgeId: badge.id } });
    expect(rules).toHaveLength(1);
    expect(JSON.parse(rules[0].value!)).toEqual({ tags: ["sale", "summer"] });
  });

  it("setBadgeMatchType persists ALL/ANY on the badge", async () => {
    const badge = await createCustomBadge(shop);
    expect(badge.matchType).toBe("ALL");

    const updated = await setBadgeMatchType(shop, badge.id, "ANY");
    expect(updated.matchType).toBe("ANY");
  });

  it("deleteRule is scoped to the given shop", async () => {
    const badge = await createCustomBadge(shop);
    const rule = await createRule(shop, badge.id, "ALL_PRODUCTS");

    await deleteRule(otherShop, rule.id);
    expect(await prisma.displayRule.findUnique({ where: { id: rule.id } })).not.toBeNull();

    await deleteRule(shop, rule.id);
    expect(await prisma.displayRule.findUnique({ where: { id: rule.id } })).toBeNull();
  });
});
