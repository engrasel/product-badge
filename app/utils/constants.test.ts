import { describe, it, expect } from "vitest";
import { BADGE_SHAPES, BADGE_TEMPLATES, DISPLAY_LOCATIONS, DISPLAY_RULE_TYPES } from "./constants";
import { FREE_SHAPES } from "./planLimits";

describe("BADGE_TEMPLATES", () => {
  it("has exactly 2 free templates and 20 Premium templates, per the spec", () => {
    expect(BADGE_TEMPLATES.filter((template) => !template.isPro)).toHaveLength(2);
    expect(BADGE_TEMPLATES.filter((template) => template.isPro)).toHaveLength(20);
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
  it("has all 11 rule types from the spec, including Price Above X", () => {
    expect(DISPLAY_RULE_TYPES).toHaveLength(11);
    expect(DISPLAY_RULE_TYPES.map((rule) => rule.value)).toContain("PRICE_ABOVE");
  });
});

describe("BADGE_SHAPES", () => {
  it("has the 4 free shapes plus 4 Premium shapes, per the spec", () => {
    expect(BADGE_SHAPES).toHaveLength(8);
    expect(BADGE_SHAPES.filter((shape) => !shape.isPro)).toHaveLength(4);
  });

  it("agrees with FREE_SHAPES on which shapes are free", () => {
    const freeInConstants = BADGE_SHAPES.filter((shape) => !shape.isPro).map((shape) => shape.value);
    expect(new Set(freeInConstants)).toEqual(new Set(FREE_SHAPES));
  });
});
