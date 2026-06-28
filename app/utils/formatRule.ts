import type { DisplayRule } from "../types/rules.types";
import { DISPLAY_RULE_TYPES } from "./constants";

// Turns a stored rule into a short human-readable summary for the removable
// chips on the Display Rules page (e.g. "Products with Tags: sale, summer").
export function formatRuleSummary(rule: Pick<DisplayRule, "type" | "value">): string {
  const label = DISPLAY_RULE_TYPES.find((entry) => entry.value === rule.type)?.label ?? rule.type;

  if (!rule.value) {
    return label;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value: any = JSON.parse(rule.value);
    switch (rule.type) {
      case "SELECTED_PRODUCTS":
        return `${label}: ${value.productTitles?.join(", ") || `${value.productIds?.length ?? 0} products`}`;
      case "SELECTED_COLLECTIONS":
        return `${label}: ${value.collectionTitles?.join(", ") || `${value.collectionIds?.length ?? 0} collections`}`;
      case "PRODUCT_TAGS":
        return `${label}: ${value.tags?.join(", ")}`;
      case "VENDOR":
        return `${label}: ${value.vendors?.join(", ")}`;
      case "PRODUCT_TYPE":
        return `${label}: ${value.productTypes?.join(", ")}`;
      case "INVENTORY_BELOW":
        return `${label}: < ${value.threshold} units`;
      case "NEW_PRODUCTS":
        return `${label}: within ${value.withinDays} days`;
      case "PRICE_ABOVE":
        return `${label}: > $${value.amount}`;
      case "STATUS":
        return `${label}: ${value.statuses?.join(", ")}`;
      default:
        return label;
    }
  } catch {
    return label;
  }
}
