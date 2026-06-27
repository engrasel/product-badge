import { describe, it, expect } from "vitest";
import { formatRuleSummary } from "./formatRule";
import type { DisplayRule } from "../types/rules.types";

function rule(type: DisplayRule["type"], value: unknown): Pick<DisplayRule, "type" | "value"> {
  return { type, value: value !== undefined ? JSON.stringify(value) : null };
}

describe("formatRuleSummary", () => {
  it("falls back to just the label when there's no value", () => {
    expect(formatRuleSummary(rule("ALL_PRODUCTS", undefined))).toBe("All Products");
    expect(formatRuleSummary(rule("DISCOUNT_PRODUCTS", undefined))).toBe("Discount Products");
  });

  it("lists product titles when available, falling back to a count", () => {
    expect(
      formatRuleSummary(rule("SELECTED_PRODUCTS", { productIds: ["1"], productTitles: ["Red Shoe"] })),
    ).toBe("Selected Products: Red Shoe");
    expect(formatRuleSummary(rule("SELECTED_PRODUCTS", { productIds: ["1", "2"], productTitles: [] }))).toBe(
      "Selected Products: 2 products",
    );
  });

  it("lists collection titles when available, falling back to a count", () => {
    expect(
      formatRuleSummary(
        rule("SELECTED_COLLECTIONS", { collectionIds: ["1"], collectionTitles: ["Summer"] }),
      ),
    ).toBe("Selected Collections: Summer");
  });

  it("joins tags, vendors, and product types", () => {
    expect(formatRuleSummary(rule("PRODUCT_TAGS", { tags: ["sale", "summer"] }))).toBe(
      "Products with Tags: sale, summer",
    );
    expect(formatRuleSummary(rule("VENDOR", { vendors: ["Acme"] }))).toBe("Products by Vendor: Acme");
    expect(formatRuleSummary(rule("PRODUCT_TYPE", { productTypes: ["Shoes"] }))).toBe(
      "Products by Product Type: Shoes",
    );
  });

  it("formats numeric thresholds", () => {
    expect(formatRuleSummary(rule("INVENTORY_BELOW", { threshold: 5 }))).toBe("Inventory Below X: < 5 units");
    expect(formatRuleSummary(rule("NEW_PRODUCTS", { withinDays: 30 }))).toBe(
      "New Products: within 30 days",
    );
    expect(formatRuleSummary(rule("PRICE_ABOVE", { amount: 50 }))).toBe("Price Above X: > $50");
  });

  it("falls back to the label if the stored value is malformed JSON", () => {
    expect(formatRuleSummary({ type: "PRODUCT_TAGS", value: "{not json" })).toBe("Products with Tags");
  });
});
