import { describe, it, expect } from "vitest";
import { BADGE_TEMPLATES, DISPLAY_LOCATIONS, DISPLAY_RULE_TYPES } from "./constants";

describe("BADGE_TEMPLATES", () => {
  it("has exactly 2 free templates and 12 Pro templates, per the spec", () => {
    expect(BADGE_TEMPLATES.filter((template) => !template.isPro)).toHaveLength(2);
    expect(BADGE_TEMPLATES.filter((template) => template.isPro)).toHaveLength(12);
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
  it("has all 10 rule types from the spec", () => {
    expect(DISPLAY_RULE_TYPES).toHaveLength(10);
  });
});
