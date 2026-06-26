import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "../db.server";
import { createCustomBadge } from "./badge.service";
import { deleteRule, upsertRule } from "./displayRule.service";

const shop = "vitest-fixture-rules.myshopify.com";
const otherShop = "vitest-fixture-rules-other.myshopify.com";

beforeEach(async () => {
  await prisma.badge.deleteMany({ where: { shop: { in: [shop, otherShop] } } });
});

afterEach(async () => {
  await prisma.badge.deleteMany({ where: { shop: { in: [shop, otherShop] } } });
});

describe("displayRule.service", () => {
  it("upsertRule replaces an existing rule of the same type instead of duplicating", async () => {
    const badge = await createCustomBadge(shop);
    await upsertRule(shop, badge.id, "PRODUCT_TAGS", { tags: ["sale"] });
    await upsertRule(shop, badge.id, "PRODUCT_TAGS", { tags: ["sale", "summer"] });

    const rules = await prisma.displayRule.findMany({ where: { badgeId: badge.id } });
    expect(rules).toHaveLength(1);
    expect(JSON.parse(rules[0].value!)).toEqual({ tags: ["sale", "summer"] });
  });

  it("upsertRule allows multiple different rule types on the same badge", async () => {
    const badge = await createCustomBadge(shop);
    await upsertRule(shop, badge.id, "PRODUCT_TAGS", { tags: ["sale"] });
    await upsertRule(shop, badge.id, "VENDOR", { vendors: ["Acme"] });

    const rules = await prisma.displayRule.findMany({ where: { badgeId: badge.id } });
    expect(rules.map((rule) => rule.type).sort()).toEqual(["PRODUCT_TAGS", "VENDOR"]);
  });

  it("upsertRule rejects badges that don't belong to the given shop", async () => {
    const badge = await createCustomBadge(shop);
    await expect(upsertRule(otherShop, badge.id, "ALL_PRODUCTS")).rejects.toThrow();
  });

  it("deleteRule is scoped to the given shop", async () => {
    const badge = await createCustomBadge(shop);
    const rule = await upsertRule(shop, badge.id, "ALL_PRODUCTS");

    await deleteRule(otherShop, rule.id);
    expect(await prisma.displayRule.findUnique({ where: { id: rule.id } })).not.toBeNull();

    await deleteRule(shop, rule.id);
    expect(await prisma.displayRule.findUnique({ where: { id: rule.id } })).toBeNull();
  });
});
