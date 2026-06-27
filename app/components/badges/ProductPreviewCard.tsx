import { useState } from "react";
import { BlockStack, InlineStack, Text, ButtonGroup, Button } from "@shopify/polaris";
import { cssFromBadgeStyle, positionStyleForBadge } from "../../utils/cssFromBadgeStyle";
import type { BadgeStyleInput } from "../../types/badge.types";

type ProductPreviewCardProps = {
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
    | "position"
    | "offsetX"
    | "offsetY"
    | "backgroundType"
    | "gradientColor1"
    | "gradientColor2"
  >;
};

const DEVICE_WIDTH = { desktop: 320, mobile: 200 };

// The Wizard's persistent live preview — a placeholder product card (image,
// title, price) with the badge overlaid exactly as cssFromBadgeStyle and
// positionStyleForBadge describe it, so what's shown here matches both the
// Customizer's old position-only preview and the real storefront renderer.
export function ProductPreviewCard({ badge }: ProductPreviewCardProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const { containerStyle, textStyle, animationClassName } = cssFromBadgeStyle(badge);
  const badgePositionStyle = positionStyleForBadge(badge.position, badge.offsetX, badge.offsetY);

  return (
    <BlockStack gap="300">
      <InlineStack align="center">
        <ButtonGroup variant="segmented">
          <Button pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
            Desktop
          </Button>
          <Button pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
            Mobile
          </Button>
        </ButtonGroup>
      </InlineStack>

      <InlineStack align="center">
        <div style={{ width: DEVICE_WIDTH[device] }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 1",
              background: "#F1F1F1",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div style={badgePositionStyle}>
              <div style={containerStyle}>
                <span className={animationClassName} style={textStyle}>
                  {badge.text}
                </span>
              </div>
            </div>
          </div>
          <BlockStack gap="100">
            <Text as="p" fontWeight="medium">
              Example Product
            </Text>
            <Text as="p" tone="subdued">
              $49.99
            </Text>
          </BlockStack>
        </div>
      </InlineStack>
    </BlockStack>
  );
}
