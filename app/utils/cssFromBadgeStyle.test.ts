import { describe, it, expect } from "vitest";
import { cssFromBadgeStyle, positionStyleForBadge } from "./cssFromBadgeStyle";
import { DEFAULT_BADGE_STYLE } from "./constants";
import type { BadgeShape } from "../types/badge.types";

function withShape(shape: BadgeShape) {
  return { ...DEFAULT_BADGE_STYLE, shape };
}

describe("cssFromBadgeStyle", () => {
  it("zeroes the border radius for RECTANGLE and ignores the stored borderRadius", () => {
    const { containerStyle } = cssFromBadgeStyle(withShape("RECTANGLE"));
    expect(containerStyle.borderRadius).toBe(0);
    expect(containerStyle.clipPath).toBeUndefined();
  });

  it("uses the stored borderRadius for ROUNDED", () => {
    const { containerStyle } = cssFromBadgeStyle({ ...withShape("ROUNDED"), borderRadius: 12 });
    expect(containerStyle.borderRadius).toBe(12);
  });

  it("forces a 50% radius and equal width/height for CIRCLE, defaulting to 32px", () => {
    const { containerStyle } = cssFromBadgeStyle({ ...withShape("CIRCLE"), width: null, height: null });
    expect(containerStyle.borderRadius).toBe("50%");
    expect(containerStyle.width).toBe(32);
    expect(containerStyle.height).toBe(32);
  });

  it("uses an explicit width for CIRCLE sizing when set", () => {
    const { containerStyle } = cssFromBadgeStyle({ ...withShape("CIRCLE"), width: 48, height: null });
    expect(containerStyle.width).toBe(48);
    expect(containerStyle.height).toBe(48);
  });

  it("uses a clipPath for RIBBON instead of a border radius", () => {
    const { containerStyle } = cssFromBadgeStyle(withShape("RIBBON"));
    expect(containerStyle.clipPath).toContain("polygon(");
    expect(containerStyle.borderRadius).toBeUndefined();
  });

  it("converts opacity from a 0-100 percentage to a 0-1 CSS value", () => {
    const { containerStyle } = cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, opacity: 50 });
    expect(containerStyle.opacity).toBe(0.5);
  });

  it("only sets a rotation transform when rotation is non-zero", () => {
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, rotation: 0 }).containerStyle.transform).toBeUndefined();
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, rotation: 15 }).containerStyle.transform).toBe(
      "rotate(15deg)",
    );
  });

  it("only sets a box shadow when shadow is true", () => {
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, shadow: false }).containerStyle.boxShadow).toBeUndefined();
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, shadow: true }).containerStyle.boxShadow).toBeDefined();
  });

  it("uses a 999px radius for PILL", () => {
    const { containerStyle } = cssFromBadgeStyle(withShape("PILL"));
    expect(containerStyle.borderRadius).toBe("999px");
    expect(containerStyle.clipPath).toBeUndefined();
  });

  it("renders OUTLINE as transparent fill with text/border carrying the color", () => {
    const { containerStyle, textStyle } = cssFromBadgeStyle({
      ...withShape("OUTLINE"),
      borderColor: "#FF3B30",
    });
    expect(containerStyle.backgroundColor).toBe("transparent");
    expect(textStyle.color).toBe("#FF3B30");
  });

  it("renders a linear-gradient background when backgroundType is GRADIENT with both colors set", () => {
    const { containerStyle } = cssFromBadgeStyle({
      ...DEFAULT_BADGE_STYLE,
      backgroundType: "GRADIENT",
      gradientColor1: "#FF3B30",
      gradientColor2: "#FFD60A",
    });
    expect(containerStyle.backgroundImage).toBe("linear-gradient(135deg, #FF3B30, #FFD60A)");
    expect(containerStyle.backgroundColor).toBeUndefined();
  });

  it("falls back to a solid background when GRADIENT is set but a gradient color is missing", () => {
    const { containerStyle } = cssFromBadgeStyle({
      ...DEFAULT_BADGE_STYLE,
      backgroundType: "GRADIENT",
      gradientColor1: null,
      gradientColor2: null,
    });
    expect(containerStyle.backgroundImage).toBeUndefined();
    expect(containerStyle.backgroundColor).toBe(DEFAULT_BADGE_STYLE.backgroundColor);
  });

  it("maps each animation to its CSS class, with NONE mapping to no class", () => {
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, animation: "NONE" }).animationClassName).toBeUndefined();
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, animation: "PULSE" }).animationClassName).toBe(
      "badge-anim-pulse",
    );
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, animation: "BOUNCE" }).animationClassName).toBe(
      "badge-anim-bounce",
    );
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, animation: "FADE" }).animationClassName).toBe(
      "badge-anim-fade",
    );
    expect(cssFromBadgeStyle({ ...DEFAULT_BADGE_STYLE, animation: "SHAKE" }).animationClassName).toBe(
      "badge-anim-shake",
    );
  });
});

describe("positionStyleForBadge", () => {
  it("anchors to the correct corner for each fixed position", () => {
    expect(positionStyleForBadge("TOP_LEFT", 0, 0)).toMatchObject({ top: 8, left: 8 });
    expect(positionStyleForBadge("TOP_RIGHT", 0, 0)).toMatchObject({ top: 8, right: 8 });
    expect(positionStyleForBadge("BOTTOM_LEFT", 0, 0)).toMatchObject({ bottom: 8, left: 8 });
    expect(positionStyleForBadge("BOTTOM_RIGHT", 0, 0)).toMatchObject({ bottom: 8, right: 8 });
  });

  it("centers with a translate transform", () => {
    expect(positionStyleForBadge("CENTER", 0, 0)).toMatchObject({
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    });
  });

  it("uses the given offsets for CUSTOM", () => {
    expect(positionStyleForBadge("CUSTOM", 20, 40)).toMatchObject({ top: 40, left: 20 });
  });
});
