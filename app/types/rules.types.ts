export type DisplayRuleType =
  | "ALL_PRODUCTS"
  | "DISCOUNT_PRODUCTS"
  | "SELECTED_PRODUCTS"
  | "SELECTED_COLLECTIONS"
  | "PRODUCT_TAGS"
  | "VENDOR"
  | "PRODUCT_TYPE"
  | "INVENTORY_BELOW"
  | "NEW_PRODUCTS"
  | "BEST_SELLING"
  | "PRICE_ABOVE"
  | "STATUS";

// Mirrors the Prisma DisplayRule model. `value` is parsed from its JSON-encoded
// column into the shape each rule type expects (see RuleValueByType below).
export interface DisplayRule {
  id: string;
  shop: string;
  badgeId: string;
  type: DisplayRuleType;
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// What `JSON.parse(rule.value)` should produce for each rule type. Titles on
// the product/collection picks are denormalized purely for display in the
// Display Rules UI (a removable chip showing names, not ids) — rule
// evaluation (ruleEvaluation.service.ts) only ever reads the id arrays.
export interface RuleValueByType {
  ALL_PRODUCTS: null;
  DISCOUNT_PRODUCTS: null;
  SELECTED_PRODUCTS: { productIds: string[]; productTitles: string[] };
  SELECTED_COLLECTIONS: { collectionIds: string[]; collectionTitles: string[] };
  PRODUCT_TAGS: { tags: string[] };
  VENDOR: { vendors: string[] };
  PRODUCT_TYPE: { productTypes: string[] };
  INVENTORY_BELOW: { threshold: number };
  NEW_PRODUCTS: { withinDays: number };
  BEST_SELLING: null;
  PRICE_ABOVE: { amount: number };
  STATUS: { statuses: ("ACTIVE" | "DRAFT" | "ARCHIVED")[] };
}
