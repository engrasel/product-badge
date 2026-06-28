// Pure Free/Premium gating rules — no server imports, safe to use from both
// loaders/services and client components. This is the single source of truth
// for what the Free plan is allowed to do; app/services/plan.service.ts
// (server-only) wraps this with the DB read/write side.
import type { BadgeShape } from "../types/badge.types";
import type { DisplayRuleType } from "../types/rules.types";
import type { DisplayLocationKey } from "../types/locations.types";

export type Plan = "FREE" | "PREMIUM";

export const FREE_RULE_TYPES: DisplayRuleType[] = ["ALL_PRODUCTS", "DISCOUNT_PRODUCTS"];
export const FREE_LOCATIONS: DisplayLocationKey[] = ["PRODUCT_CARDS", "PRODUCT_DETAIL_PAGE"];
export const FREE_SHAPES: BadgeShape[] = ["RECTANGLE", "ROUNDED", "CIRCLE", "RIBBON"];

export function canUseTemplate(plan: Plan, templateKey: string, isPro: boolean): boolean {
  if (plan === "PREMIUM") return true;
  return !isPro;
}

export function canUseRuleType(plan: Plan, type: DisplayRuleType): boolean {
  return plan === "PREMIUM" || FREE_RULE_TYPES.includes(type);
}

export function canUseLocation(plan: Plan, key: DisplayLocationKey): boolean {
  return plan === "PREMIUM" || FREE_LOCATIONS.includes(key);
}

export function canUseShape(plan: Plan, shape: BadgeShape): boolean {
  return plan === "PREMIUM" || FREE_SHAPES.includes(shape);
}
