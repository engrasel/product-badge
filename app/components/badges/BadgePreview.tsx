import { cssFromBadgeStyle } from "../../utils/cssFromBadgeStyle";
import type { BadgeStyleInput } from "../../types/badge.types";

type BadgePreviewProps = {
  badge: Pick<
    BadgeStyleInput,
    | "text"
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
  > & {
    /** Future-ready hook: an optional merchant-supplied class for theme-level CSS overrides. */
    customCss?: string | null;
  };
};

// Renders a badge exactly as cssFromBadgeStyle describes it — reused by the
// Badge Library cards, the Dashboard's active badges list, and the live
// preview in the Customizer (Phase 5).
export function BadgePreview({ badge }: BadgePreviewProps) {
  const { containerStyle, textStyle, animationClassName } =
    cssFromBadgeStyle(badge);

  return (
    <div style={containerStyle} className={badge.customCss || undefined}>
      <span className={animationClassName} style={textStyle}>
        {badge.text}
      </span>
    </div>
  );
}
