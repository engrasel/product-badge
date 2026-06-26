import { Modal, BlockStack, Text } from "@shopify/polaris";
import type { BadgeTemplate } from "../../types/badge.types";

type UpgradeToProModalProps = {
  template: BadgeTemplate | null;
  onClose: () => void;
};

// Shown when a merchant selects a Premium badge template. Billing isn't wired
// up yet ("no billing required for now" per spec), so the primary action is a
// placeholder until the Shopify Billing API is integrated.
export function UpgradeToProModal({ template, onClose }: UpgradeToProModalProps) {
  return (
    <Modal
      open={template !== null}
      onClose={onClose}
      title="Upgrade to Pro"
      primaryAction={{ content: "Upgrade to Pro", onAction: onClose }}
      secondaryActions={[{ content: "Maybe later", onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="200">
          <Text as="p">
            {template ? `"${template.name}"` : "This badge"} is a Pro
            template. Upgrade to Pro to unlock all 12 premium badge designs,
            including Best Seller, Flash Sale, Black Friday, and more.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
