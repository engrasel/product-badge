import { InlineStack, Badge as StatusBadge, Icon } from "@shopify/polaris";
import { LockIcon } from "@shopify/polaris-icons";

// Small lock-icon + "Premium" tag, dropped next to any gated control's label
// (gradient toggle, advanced shapes, animations, custom CSS, schedule,
// locations, rule types) so the lock is visually consistent everywhere.
export function PremiumLock() {
  return (
    <InlineStack gap="100" blockAlign="center">
      <Icon source={LockIcon} tone="subdued" />
      <StatusBadge tone="warning">Premium</StatusBadge>
    </InlineStack>
  );
}
