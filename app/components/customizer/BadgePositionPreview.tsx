import { BadgePreview } from "../badges/BadgePreview";
import { positionStyleForBadge } from "../../utils/cssFromBadgeStyle";
import type { BadgeStyleInput } from "../../types/badge.types";

type BadgePositionPreviewProps = {
  badge: BadgeStyleInput;
};

// The live preview: the badge positioned over a mock product image the way
// it will actually sit on the storefront, not just rendered in isolation.
export function BadgePositionPreview({ badge }: BadgePositionPreviewProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        background: "#f1f2f3",
        border: "1px solid #e1e3e5",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={positionStyleForBadge(badge.position, badge.offsetX, badge.offsetY)}>
        <BadgePreview badge={badge} />
      </div>
    </div>
  );
}
