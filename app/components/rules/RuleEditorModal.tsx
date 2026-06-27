import { useState } from "react";
import {
  Modal,
  BlockStack,
  Select,
  TextField,
  Button,
  InlineStack,
  Tag,
  Text,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { DISPLAY_RULE_TYPES } from "../../utils/constants";
import { canUseRuleType, type Plan } from "../../utils/planLimits";
import type { DisplayRuleType } from "../../types/rules.types";

type Picked = { id: string; title: string };

type RuleEditorModalProps = {
  badgeName: string;
  existingTypes: DisplayRuleType[];
  onClose: () => void;
  onSave: (type: DisplayRuleType, value: unknown) => void;
  saving?: boolean;
  /** Defaults to PREMIUM (no gating) so existing call sites are unaffected. */
  plan?: Plan;
  onLockedSelect?: () => void;
};

const NO_VALUE_TYPES: DisplayRuleType[] = ["ALL_PRODUCTS", "DISCOUNT_PRODUCTS", "BEST_SELLING"];

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Add/edit a single Display Rule for a badge. The value shape submitted to
// the action matches RuleValueByType for whichever `type` is selected.
export function RuleEditorModal({
  badgeName,
  existingTypes,
  onClose,
  onSave,
  saving,
  plan = "PREMIUM",
  onLockedSelect,
}: RuleEditorModalProps) {
  const shopify = useAppBridge();
  const [type, setType] = useState<DisplayRuleType>("ALL_PRODUCTS");
  const [products, setProducts] = useState<Picked[]>([]);
  const [collections, setCollections] = useState<Picked[]>([]);
  const [tagsText, setTagsText] = useState("");
  const [vendorsText, setVendorsText] = useState("");
  const [productTypesText, setProductTypesText] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [withinDays, setWithinDays] = useState("30");
  const [priceAmount, setPriceAmount] = useState("50");

  const typeOptions = DISPLAY_RULE_TYPES.map((entry) => {
    const locked = !canUseRuleType(plan, entry.value);
    const alreadySet = existingTypes.includes(entry.value) && entry.value !== type;
    return {
      value: entry.value,
      label: [entry.label, locked && "🔒 Premium", alreadySet && "(already set — will be replaced)"]
        .filter(Boolean)
        .join(" "),
    };
  });

  const handleTypeChange = (value: string) => {
    const nextType = value as DisplayRuleType;
    if (!canUseRuleType(plan, nextType)) {
      onLockedSelect?.();
      return;
    }
    setType(nextType);
  };

  const pickProducts = async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: products.map((product) => ({ id: product.id })),
    });
    if (selected) {
      setProducts(selected.map((item) => ({ id: item.id, title: item.title })));
    }
  };

  const pickCollections = async () => {
    const selected = await shopify.resourcePicker({
      type: "collection",
      multiple: true,
      selectionIds: collections.map((collection) => ({ id: collection.id })),
    });
    if (selected) {
      setCollections(selected.map((item) => ({ id: item.id, title: item.title })));
    }
  };

  const handleSave = () => {
    switch (type) {
      case "ALL_PRODUCTS":
      case "DISCOUNT_PRODUCTS":
      case "BEST_SELLING":
        onSave(type, undefined);
        return;
      case "SELECTED_PRODUCTS":
        onSave(type, {
          productIds: products.map((product) => product.id),
          productTitles: products.map((product) => product.title),
        });
        return;
      case "SELECTED_COLLECTIONS":
        onSave(type, {
          collectionIds: collections.map((collection) => collection.id),
          collectionTitles: collections.map((collection) => collection.title),
        });
        return;
      case "PRODUCT_TAGS":
        onSave(type, { tags: splitList(tagsText) });
        return;
      case "VENDOR":
        onSave(type, { vendors: splitList(vendorsText) });
        return;
      case "PRODUCT_TYPE":
        onSave(type, { productTypes: splitList(productTypesText) });
        return;
      case "INVENTORY_BELOW":
        onSave(type, { threshold: Number(threshold) || 0 });
        return;
      case "NEW_PRODUCTS":
        onSave(type, { withinDays: Number(withinDays) || 30 });
        return;
      case "PRICE_ABOVE":
        onSave(type, { amount: Number(priceAmount) || 0 });
        return;
    }
  };

  const isSaveDisabled =
    (type === "SELECTED_PRODUCTS" && products.length === 0) ||
    (type === "SELECTED_COLLECTIONS" && collections.length === 0) ||
    (type === "PRODUCT_TAGS" && splitList(tagsText).length === 0) ||
    (type === "VENDOR" && splitList(vendorsText).length === 0) ||
    (type === "PRODUCT_TYPE" && splitList(productTypesText).length === 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Add Display Rule — ${badgeName}`}
      primaryAction={{
        content: "Save Rule",
        onAction: handleSave,
        loading: saving,
        disabled: isSaveDisabled,
      }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Select
            label="Condition"
            options={typeOptions}
            value={type}
            onChange={handleTypeChange}
          />

          {type === "SELECTED_PRODUCTS" && (
            <BlockStack gap="200">
              <Button onClick={pickProducts}>Select Products</Button>
              <InlineStack gap="100">
                {products.map((product) => (
                  <Tag
                    key={product.id}
                    onRemove={() => setProducts(products.filter((item) => item.id !== product.id))}
                  >
                    {product.title}
                  </Tag>
                ))}
              </InlineStack>
            </BlockStack>
          )}

          {type === "SELECTED_COLLECTIONS" && (
            <BlockStack gap="200">
              <Button onClick={pickCollections}>Select Collections</Button>
              <InlineStack gap="100">
                {collections.map((collection) => (
                  <Tag
                    key={collection.id}
                    onRemove={() =>
                      setCollections(collections.filter((item) => item.id !== collection.id))
                    }
                  >
                    {collection.title}
                  </Tag>
                ))}
              </InlineStack>
            </BlockStack>
          )}

          {type === "PRODUCT_TAGS" && (
            <TextField
              label="Tags"
              value={tagsText}
              onChange={setTagsText}
              autoComplete="off"
              placeholder="sale, summer, limited"
              helpText="Comma-separated. Matches products with any of these tags."
            />
          )}

          {type === "VENDOR" && (
            <TextField
              label="Vendors"
              value={vendorsText}
              onChange={setVendorsText}
              autoComplete="off"
              placeholder="Acme, Globex"
              helpText="Comma-separated."
            />
          )}

          {type === "PRODUCT_TYPE" && (
            <TextField
              label="Product Types"
              value={productTypesText}
              onChange={setProductTypesText}
              autoComplete="off"
              placeholder="Shoes, Bags"
              helpText="Comma-separated."
            />
          )}

          {type === "INVENTORY_BELOW" && (
            <TextField
              label="Inventory below"
              type="number"
              value={threshold}
              onChange={setThreshold}
              autoComplete="off"
              suffix="units"
            />
          )}

          {type === "NEW_PRODUCTS" && (
            <TextField
              label="Published within"
              type="number"
              value={withinDays}
              onChange={setWithinDays}
              autoComplete="off"
              suffix="days"
            />
          )}

          {type === "PRICE_ABOVE" && (
            <TextField
              label="Price greater than"
              type="number"
              value={priceAmount}
              onChange={setPriceAmount}
              autoComplete="off"
              prefix="$"
            />
          )}

          {NO_VALUE_TYPES.includes(type) && (
            <Text as="p" tone="subdued">
              {DISPLAY_RULE_TYPES.find((entry) => entry.value === type)?.description}
            </Text>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
