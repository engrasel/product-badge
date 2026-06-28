import { describe, it, expect } from "vitest";
import { BADGE_SHAPES, BADGE_TEMPLATES, DISPLAY_LOCATIONS, DISPLAY_RULE_TYPES } from "./constants";

describe("BADGE_TEMPLATES", () => {
  it("has 22 templates", () => {
    expect(BADGE_TEMPLATES).toHaveLength(22);
  });

  it("has unique keys", () => {
    const keys = BADGE_TEMPLATES.map((template) => template.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("DISPLAY_LOCATIONS", () => {
  it("has all 13 locations from the spec", () => {
    expect(DISPLAY_LOCATIONS).toHaveLength(13);
  });

  it("marks only Cart Drawer as coming soon", () => {
    const comingSoon = DISPLAY_LOCATIONS.filter((location) => location.comingSoon);
    expect(comingSoon).toHaveLength(1);
    expect(comingSoon[0].value).toBe("CART_DRAWER");
  });

  it("has unique keys", () => {
    const keys = DISPLAY_LOCATIONS.map((location) => location.value);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("DISPLAY_RULE_TYPES", () => {
  it("has all 12 rule types, including Price Above X and Status", () => {
    expect(DISPLAY_RULE_TYPES).toHaveLength(12);
    expect(DISPLAY_RULE_TYPES.map((rule) => rule.value)).toContain("PRICE_ABOVE");
    expect(DISPLAY_RULE_TYPES.map((rule) => rule.value)).toContain("STATUS");
  });
});

describe("BADGE_SHAPES", () => {
  it("has 8 shapes", () => {
    expect(BADGE_SHAPES).toHaveLength(8);
  });
});
