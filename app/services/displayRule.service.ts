import prisma from "../db.server";
import type { DisplayRuleType, RuleValueByType } from "../types/rules.types";
import { getShopPlan } from "./plan.service";
import { canUseRuleType } from "../utils/planLimits";

// A badge has at most one rule per type (multiple types AND together; see
// ruleEvaluation.service.ts) — adding a rule of a type the badge already has
// replaces its value rather than creating a duplicate.
export async function upsertRule<T extends DisplayRuleType>(
  shop: string,
  badgeId: string,
  type: T,
  value?: RuleValueByType[T],
) {
  const badge = await prisma.badge.findFirst({ where: { id: badgeId, shop } });
  if (!badge) {
    throw new Error("Badge not found");
  }

  const { plan } = await getShopPlan(shop);
  if (!canUseRuleType(plan, type)) {
    throw new Error(`"${type}" is a Premium rule type and cannot be used on the Free plan`);
  }

  const serializedValue = value !== undefined ? JSON.stringify(value) : null;
  const existing = await prisma.displayRule.findFirst({ where: { badgeId, type } });

  if (existing) {
    return prisma.displayRule.update({
      where: { id: existing.id },
      data: { value: serializedValue },
    });
  }

  return prisma.displayRule.create({
    data: { shop, badgeId, type, value: serializedValue },
  });
}

export async function deleteRule(shop: string, id: string) {
  return prisma.displayRule.deleteMany({ where: { id, shop } });
}
