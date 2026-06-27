import type { CSSProperties } from "react";
import type { BadgePosition, BadgeStyleInput } from "../types/badge.types";

export interface BadgeCssResult {
  containerStyle: CSSProperties;
  textStyle: CSSProperties;
  animationClassName: string | undefined;
}

const ANIMATION_CLASS_NAME: Record<BadgeStyleInput["animation"], string | undefined> = {
  NONE: undefined,
  PULSE: "badge-anim-pulse",
  BOUNCE: "badge-anim-bounce",
  FADE: "badge-anim-fade",
  SHAKE: "badge-anim-shake",
};

type BadgeStyleSubset = Pick<
  BadgeStyleInput,
  | "backgroundColor"
  | "textColor"
  | "borderColor"
  | "fontSize"
  | "fontWeight"
  | "borderRadius"
  | "shadow"
  | "opacity"
  | "rotation"
  | "paddingX"
  | "paddingY"
  | "width"
  | "height"
  | "shape"
  | "animation"
> &
  Partial<Pick<BadgeStyleInput, "backgroundType" | "gradientColor1" | "gradientColor2">>;

/**
 * Single source of truth for turning a badge's stored style fields into renderable
 * CSS. Used by both the admin live preview and the storefront extension renderer,
 * so the two never drift out of sync.
 *
 * `rotation` is applied on the outer container while the animation class goes on
 * the inner element — keeping them on separate elements avoids the static
 * `transform: rotate()` fighting with the transform-based keyframes used by the
 * pulse/bounce/shake animations.
 */
// Tag/Corner reuse a clipPath notch like Ribbon; Pill is just a very large
// border-radius; Outline drops the fill and lets the border/text carry it.
const CLIP_PATH_BY_SHAPE: Partial<Record<BadgeStyleSubset["shape"], string>> = {
  RIBBON: "polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)",
  TAG: "polygon(15% 0%, 100% 0%, 100% 100%, 15% 100%, 0% 50%)",
  CORNER: "polygon(0% 0%, 100% 0%, 0% 100%)",
};

export function cssFromBadgeStyle(badge: BadgeStyleSubset): BadgeCssResult {
  const isCircle = badge.shape === "CIRCLE";
  const circleSize = badge.width ?? badge.height ?? 32;
  const isOutline = badge.shape === "OUTLINE";
  const isGradient = badge.backgroundType === "GRADIENT" && badge.gradientColor1 && badge.gradientColor2;

  const containerStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isOutline ? "transparent" : isGradient ? undefined : badge.backgroundColor,
    backgroundImage: isGradient
      ? `linear-gradient(135deg, ${badge.gradientColor1}, ${badge.gradientColor2})`
      : undefined,
    border: `1px solid ${badge.borderColor}`,
    opacity: badge.opacity / 100,
    transform: badge.rotation ? `rotate(${badge.rotation}deg)` : undefined,
    boxShadow: badge.shadow ? "0 2px 6px rgba(0, 0, 0, 0.25)" : undefined,
    width: isCircle ? circleSize : badge.width ?? undefined,
    height: isCircle ? circleSize : badge.height ?? undefined,
    padding: isCircle ? undefined : `${badge.paddingY}px ${badge.paddingX}px`,
    borderRadius:
      badge.shape === "CIRCLE"
        ? "50%"
        : badge.shape === "PILL"
          ? "999px"
          : badge.shape === "RECTANGLE" || badge.shape === "OUTLINE"
            ? 0
            : badge.shape === "ROUNDED"
              ? badge.borderRadius
              : undefined, // RIBBON/TAG/CORNER use clipPath below instead of a border-radius
    clipPath: CLIP_PATH_BY_SHAPE[badge.shape],
  };

  const textStyle: CSSProperties = {
    color: isOutline ? badge.borderColor : badge.textColor,
    fontSize: badge.fontSize,
    fontWeight: badge.fontWeight as CSSProperties["fontWeight"],
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  return {
    containerStyle,
    textStyle,
    animationClassName: ANIMATION_CLASS_NAME[badge.animation],
  };
}

const PREVIEW_EDGE_OFFSET = 8;

/**
 * Where a badge sits on top of its product image — shared by the admin live
 * preview and, in Phase 7, the storefront renderer, so a badge placed
 * "Top Right" in the Customizer ends up in the same spot on the storefront.
 */
export function positionStyleForBadge(
  position: BadgePosition,
  offsetX: number,
  offsetY: number,
): CSSProperties {
  const base: CSSProperties = { position: "absolute" };

  switch (position) {
    case "TOP_LEFT":
      return { ...base, top: PREVIEW_EDGE_OFFSET, left: PREVIEW_EDGE_OFFSET };
    case "TOP_CENTER":
      return {
        ...base,
        top: PREVIEW_EDGE_OFFSET,
        left: "50%",
        transform: "translateX(-50%)",
      };
    case "TOP_RIGHT":
      return { ...base, top: PREVIEW_EDGE_OFFSET, right: PREVIEW_EDGE_OFFSET };
    case "MIDDLE_LEFT":
      return {
        ...base,
        top: "50%",
        left: PREVIEW_EDGE_OFFSET,
        transform: "translateY(-50%)",
      };
    case "MIDDLE_RIGHT":
      return {
        ...base,
        top: "50%",
        right: PREVIEW_EDGE_OFFSET,
        transform: "translateY(-50%)",
      };
    case "BOTTOM_LEFT":
      return { ...base, bottom: PREVIEW_EDGE_OFFSET, left: PREVIEW_EDGE_OFFSET };
    case "BOTTOM_CENTER":
      return {
        ...base,
        bottom: PREVIEW_EDGE_OFFSET,
        left: "50%",
        transform: "translateX(-50%)",
      };
    case "BOTTOM_RIGHT":
      return { ...base, bottom: PREVIEW_EDGE_OFFSET, right: PREVIEW_EDGE_OFFSET };
    case "CENTER":
      return {
        ...base,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    case "CUSTOM":
      return { ...base, top: offsetY, left: offsetX };
  }
}
