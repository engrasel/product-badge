import { BlockStack, InlineStack, Icon, Checkbox, Text, TextField } from "@shopify/polaris";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDiagonalIcon,
  TargetIcon,
  TargetFilledIcon,
} from "@shopify/polaris-icons";
import type { BadgePosition } from "../../types/badge.types";

type PositionPickerProps = {
  position: BadgePosition;
  offsetX: number;
  offsetY: number;
  onChange: (position: BadgePosition) => void;
  onOffsetChange: (offsetX: number, offsetY: number) => void;
};

// One cell of the 3x3 grid: a directional icon (rotated per-corner from the
// single ArrowDiagonalIcon) plus the position it selects.
const GRID: { value: BadgePosition; icon: typeof ArrowUpIcon; rotate: number }[] = [
  { value: "TOP_LEFT", icon: ArrowDiagonalIcon, rotate: -90 },
  { value: "TOP_CENTER", icon: ArrowUpIcon, rotate: 0 },
  { value: "TOP_RIGHT", icon: ArrowDiagonalIcon, rotate: 0 },
  { value: "MIDDLE_LEFT", icon: ArrowLeftIcon, rotate: 0 },
  { value: "CENTER", icon: TargetIcon, rotate: 0 },
  { value: "MIDDLE_RIGHT", icon: ArrowRightIcon, rotate: 0 },
  { value: "BOTTOM_LEFT", icon: ArrowDiagonalIcon, rotate: 180 },
  { value: "BOTTOM_CENTER", icon: ArrowDownIcon, rotate: 0 },
  { value: "BOTTOM_RIGHT", icon: ArrowDiagonalIcon, rotate: 90 },
];

// Visual 3x3 position grid (matches the "Position" control in popular badge
// apps) over the existing BadgePosition enum, plus a manual-offset escape
// hatch for pixel-precise placement — both write to the same Badge fields
// the storefront renderer and live preview already read.
export function PositionPicker({
  position,
  offsetX,
  offsetY,
  onChange,
  onOffsetChange,
}: PositionPickerProps) {
  const isManual = position === "CUSTOM";

  return (
    <BlockStack gap="300">
      <Text as="p" variant="bodyMd" fontWeight="medium">
        Position
      </Text>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 48px)",
          gridTemplateRows: "repeat(3, 48px)",
          gap: 6,
        }}
      >
        {GRID.map((cell) => {
          const selected = !isManual && position === cell.value;
          const isCenterTarget = cell.value === "CENTER";
          return (
            <button
              key={cell.value}
              type="button"
              onClick={() => onChange(cell.value)}
              aria-label={cell.value.replace(/_/g, " ")}
              aria-pressed={selected}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                borderRadius: 8,
                border: selected ? "2px solid #2c6ecb" : "1px solid #c9cccf",
                background: selected ? "#f1f8ff" : "white",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "inline-flex", transform: `rotate(${cell.rotate}deg)` }}>
                <Icon
                  source={isCenterTarget && selected ? TargetFilledIcon : cell.icon}
                  tone={selected ? "info" : "subdued"}
                />
              </span>
            </button>
          );
        })}
      </div>

      <Checkbox
        label="Adjust position manually"
        checked={isManual}
        onChange={(checked) => onChange(checked ? "CUSTOM" : "TOP_RIGHT")}
      />

      {isManual && (
        <InlineStack gap="300" wrap={false}>
          <TextField
            label="Offset X (px)"
            type="number"
            value={String(offsetX)}
            onChange={(value) => onOffsetChange(Number(value || 0), offsetY)}
            autoComplete="off"
          />
          <TextField
            label="Offset Y (px)"
            type="number"
            value={String(offsetY)}
            onChange={(value) => onOffsetChange(offsetX, Number(value || 0))}
            autoComplete="off"
          />
        </InlineStack>
      )}
    </BlockStack>
  );
}
