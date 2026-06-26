import { BlockStack, InlineStack, Text, Badge as StatusBadge, Button, Box, Icon } from "@shopify/polaris";
import { LockIcon } from "@shopify/polaris-icons";
import { BadgePreview } from "./BadgePreview";
import type { BadgeTemplate } from "../../types/badge.types";

type BadgeCardProps = {
  template: BadgeTemplate;
  loading?: boolean;
  onSelect: (template: BadgeTemplate) => void;
};

// One card in the Badge Library grid — preview, name, Free/Premium label, and
// a Select button. Premium templates show a lock icon; selecting one opens the
// "Upgrade to Pro" prompt instead of creating a badge (handled by the caller).
export function BadgeCard({ template, loading, onSelect }: BadgeCardProps) {
  return (
    <Box
      background="bg-surface"
      borderRadius="300"
      borderWidth="025"
      borderColor="border"
      padding="400"
    >
      <BlockStack gap="400">
        <Box
          background="bg-surface-secondary"
          borderRadius="200"
          padding="600"
        >
          <InlineStack align="center" blockAlign="center">
            <BadgePreview
              badge={{
                text: template.preview.text,
                backgroundColor: template.preview.backgroundColor,
                textColor: template.preview.textColor,
                borderColor: template.preview.borderColor,
                fontSize: 12,
                fontWeight: "600",
                borderRadius: 4,
                shadow: false,
                opacity: 100,
                rotation: 0,
                paddingX: 10,
                paddingY: 5,
                width: null,
                height: null,
                shape: template.preview.shape,
                animation: template.preview.animation,
              }}
            />
          </InlineStack>
        </Box>

        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" fontWeight="semibold">
            {template.name}
          </Text>
          {template.isPro ? (
            <InlineStack gap="100" blockAlign="center">
              <Icon source={LockIcon} tone="subdued" />
              <StatusBadge tone="warning">Premium</StatusBadge>
            </InlineStack>
          ) : (
            <StatusBadge tone="success">Free</StatusBadge>
          )}
        </InlineStack>

        <Button onClick={() => onSelect(template)} loading={loading} fullWidth>
          Select
        </Button>
      </BlockStack>
    </Box>
  );
}
