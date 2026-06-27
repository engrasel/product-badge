import { Modal, BlockStack, Text } from "@shopify/polaris";
import { useNavigate } from "react-router";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
};

// The single "Unlock Premium Features" prompt used everywhere a locked
// control is clicked (templates, custom designer, gradient, advanced shapes,
// rules, locations, schedule, animation, custom CSS) — one component, one
// copy, one place to change the pitch.
export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const navigate = useNavigate();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unlock Premium Features"
      primaryAction={{
        content: "Upgrade Now",
        onAction: () => navigate("/app/billing"),
      }}
      secondaryActions={[{ content: "Maybe Later", onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="200">
          <Text as="p">
            Upgrade for only $1/month to unlock all badge templates, custom
            badge designer, advanced rules, and all display locations.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
