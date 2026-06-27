import { describe, it, expect } from "vitest";
import {
  canUseLocation,
  canUseRuleType,
  canUseShape,
  canUseTemplate,
  isAtFreeBadgeLimit,
} from "./planLimits";

describe("planLimits", () => {
  it("canUseTemplate allows only the free templates on Free, and everything on Premium", () => {
    expect(canUseTemplate("FREE", "sale", false)).toBe(true);
    expect(canUseTemplate("FREE", "best-seller", true)).toBe(false);
    expect(canUseTemplate("PREMIUM", "best-seller", true)).toBe(true);
  });

  it("canUseRuleType allows only ALL_PRODUCTS/DISCOUNT_PRODUCTS on Free", () => {
    expect(canUseRuleType("FREE", "ALL_PRODUCTS")).toBe(true);
    expect(canUseRuleType("FREE", "DISCOUNT_PRODUCTS")).toBe(true);
    expect(canUseRuleType("FREE", "PRICE_ABOVE")).toBe(false);
    expect(canUseRuleType("PREMIUM", "PRICE_ABOVE")).toBe(true);
  });

  it("canUseLocation allows only Product Cards/Product Page on Free", () => {
    expect(canUseLocation("FREE", "PRODUCT_CARDS")).toBe(true);
    expect(canUseLocation("FREE", "COLLECTION_CARDS")).toBe(false);
    expect(canUseLocation("PREMIUM", "COLLECTION_CARDS")).toBe(true);
  });

  it("canUseShape allows only the 4 basic shapes on Free", () => {
    expect(canUseShape("FREE", "RIBBON")).toBe(true);
    expect(canUseShape("FREE", "PILL")).toBe(false);
    expect(canUseShape("PREMIUM", "PILL")).toBe(true);
  });

  it("isAtFreeBadgeLimit is only true for Free shops with 2+ active badges", () => {
    expect(isAtFreeBadgeLimit("FREE", 1)).toBe(false);
    expect(isAtFreeBadgeLimit("FREE", 2)).toBe(true);
    expect(isAtFreeBadgeLimit("PREMIUM", 50)).toBe(false);
  });
});
