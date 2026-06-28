import prisma from "../db.server";
import type { DisplayRuleType, RuleValueByType } from "../types/rules.types";

// A badge can have any number of rules, including several of the same type
// (e.g. two PRODUCT_TAGS conditions) — how they combine is controlled by the
// badge's matchType ("ALL" AND's every rule, "ANY" OR's them; see
// ruleEvaluation.service.ts).
export async function createRule<T extends DisplayRuleType>(
  shop: string,
  badgeId: string,
  type: T,
  value?: RuleValueByType[T],
) {
  const badge = await prisma.badge.findFirst({ where: { id: badgeId, shop } });
  if (!badge) {
    throw new Error("Badge not found");
  }

  const serializedValue = value !== undefined ? JSON.stringify(value) : null;
  return prisma.displayRule.create({
    data: { shop, badgeId, type, value: serializedValue },
  });
}

export async function updateRuleValue(shop: string, id: string, value: unknown) {
  const rule = await prisma.displayRule.findFirst({ where: { id, shop } });
  if (!rule) {
    throw new Error("Rule not found");
  }
  return prisma.displayRule.update({
    where: { id },
    data: { value: value !== undefined ? JSON.stringify(value) : null },
  });
}

export async function setBadgeMatchType(shop: string, badgeId: string, matchType: "ALL" | "ANY") {
  const badge = await prisma.badge.findFirst({ where: { id: badgeId, shop } });
  if (!badge) {
    throw new Error("Badge not found");
  }
  return prisma.badge.update({ where: { id: badgeId }, data: { matchType } });
}

export async function deleteRule(shop: string, id: string) {
  return prisma.displayRule.deleteMany({ where: { id, shop } });
}
