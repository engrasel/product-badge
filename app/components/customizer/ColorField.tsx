import { InlineStack, TextField } from "@shopify/polaris";

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

// A hex TextField paired with a native color-picker swatch. Polaris's own
// ColorPicker works in HSB and doesn't bind cleanly to a stored "#RRGGBB"
// string, so this is simpler for a value that's persisted as hex.
export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <InlineStack gap="200" blockAlign="end" wrap={false}>
      <input
        type="color"
        value={HEX_PATTERN.test(value) ? value : "#000000"}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} swatch`}
        style={{
          width: 36,
          height: 36,
          padding: 0,
          border: "1px solid #c9cccf",
          borderRadius: 6,
          cursor: "pointer",
          flexShrink: 0,
        }}
      />
      <div style={{ flexGrow: 1 }}>
        <TextField label={label} value={value} onChange={onChange} autoComplete="off" />
      </div>
    </InlineStack>
  );
}
