import { useState } from "react";
import {
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  InlineStack,
  RadioButton,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { DISPLAY_RULE_TYPES } from "../../utils/constants";
import { formatRuleSummary } from "../../utils/formatRule";
import type { DisplayRule, DisplayRuleType } from "../../types/rules.types";

type Picked = { id: string; title: string };

type RuleBuilderProps = {
  rules: DisplayRule[];
  matchType: "ALL" | "ANY";
  onChangeMatchType: (matchType: "ALL" | "ANY") => void;
  onAddRule: (type: DisplayRuleType, value: unknown) => void;
  onRemoveRule: (ruleId: string) => void;
  saving?: boolean;
};

const NO_VALUE_TYPES: DisplayRuleType[] = ["ALL_PRODUCTS", "DISCOUNT_PRODUCTS", "BEST_SELLING"];
const STATUS_OPTIONS: ("ACTIVE" | "DRAFT" | "ARCHIVED")[] = ["ACTIVE", "DRAFT", "ARCHIVED"];

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// A professional rule builder: a list of existing conditions (each removable)
// plus an inline "Add condition" row — no modal interruption per add — and a
// Match ALL/ANY control deciding how the conditions combine.
export function RuleBuilder({
  rules,
  matchType,
  onChangeMatchType,
  onAddRule,
  onRemoveRule,
  saving,
}: RuleBuilderProps) {
  const shopify = useAppBridge();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<DisplayRuleType>("ALL_PRODUCTS");
  const [products, setProducts] = useState<Picked[]>([]);
  const [collections, setCollections] = useState<Picked[]>([]);
  const [tagsText, setTagsText] = useState("");
  const [vendorsText, setVendorsText] = useState("");
  const [productTypesText, setProductTypesText] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [withinDays, setWithinDays] = useState("30");
  const [priceAmount, setPriceAmount] = useState("50");
  const [statuses, setStatuses] = useState<("ACTIVE" | "DRAFT" | "ARCHIVED")[]>([]);

  const resetDraft = () => {
    setType("ALL_PRODUCTS");
    setProducts([]);
    setCollections([]);
    setTagsText("");
    setVendorsText("");
    setProductTypesText("");
    setThreshold("5");
    setWithinDays("30");
    setPriceAmount("50");
    setStatuses([]);
    setAdding(false);
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

  const handleAdd = () => {
    switch (type) {
      case "ALL_PRODUCTS":
      case "DISCOUNT_PRODUCTS":
      case "BEST_SELLING":
        onAddRule(type, undefined);
        break;
      case "SELECTED_PRODUCTS":
        onAddRule(type, {
          productIds: products.map((product) => product.id),
          productTitles: products.map((product) => product.title),
        });
        break;
      case "SELECTED_COLLECTIONS":
        onAddRule(type, {
          collectionIds: collections.map((collection) => collection.id),
          collectionTitles: collections.map((collection) => collection.title),
        });
        break;
      case "PRODUCT_TAGS":
        onAddRule(type, { tags: splitList(tagsText) });
        break;
      case "VENDOR":
        onAddRule(type, { vendors: splitList(vendorsText) });
        break;
      case "PRODUCT_TYPE":
        onAddRule(type, { productTypes: splitList(productTypesText) });
        break;
      case "INVENTORY_BELOW":
        onAddRule(type, { threshold: Number(threshold) || 0 });
        break;
      case "NEW_PRODUCTS":
        onAddRule(type, { withinDays: Number(withinDays) || 30 });
        break;
      case "PRICE_ABOVE":
        onAddRule(type, { amount: Number(priceAmount) || 0 });
        break;
      case "STATUS":
        onAddRule(type, { statuses });
        break;
    }
    resetDraft();
  };

  const isAddDisabled =
    (type === "SELECTED_PRODUCTS" && products.length === 0) ||
    (type === "SELECTED_COLLECTIONS" && collections.length === 0) ||
    (type === "PRODUCT_TAGS" && splitList(tagsText).length === 0) ||
    (type === "VENDOR" && splitList(vendorsText).length === 0) ||
    (type === "PRODUCT_TYPE" && splitList(productTypesText).length === 0) ||
    (type === "STATUS" && statuses.length === 0);

  return (
    <BlockStack gap="400">
      <InlineStack gap="400">
        <RadioButton
          label="Match ALL conditions"
          checked={matchType === "ALL"}
          onChange={() => onChangeMatchType("ALL")}
          name="matchType"
        />
        <RadioButton
          label="Match ANY condition"
          checked={matchType === "ANY"}
          onChange={() => onChangeMatchType("ANY")}
          name="matchType"
        />
      </InlineStack>

      {rules.length === 0 ? (
        <Text as="p" tone="subdued">
          No conditions yet — this badge won&apos;t show anywhere until you add one.
        </Text>
      ) : (
        <BlockStack gap="200">
          {rules.map((rule) => (
            <InlineStack key={rule.id} align="space-between" blockAlign="center">
              <Text as="span">{formatRuleSummary(rule)}</Text>
              <Button size="slim" tone="critical" onClick={() => onRemoveRule(rule.id)}>
                Remove
              </Button>
            </InlineStack>
          ))}
        </BlockStack>
      )}

      {adding ? (
        <Box background="bg-surface-secondary" borderRadius="200" padding="400">
          <BlockStack gap="300">
            <Select
              label="Condition"
              options={DISPLAY_RULE_TYPES.map((entry) => ({ value: entry.value, label: entry.label }))}
              value={type}
              onChange={(value) => setType(value as DisplayRuleType)}
            />

            {type === "SELECTED_PRODUCTS" && (
              <BlockStack gap="200">
                <Button onClick={pickProducts}>Select Products</Button>
                <Text as="span" tone="subdued">
                  {products.length > 0 ? products.map((p) => p.title).join(", ") : "No products selected"}
                </Text>
              </BlockStack>
            )}

            {type === "SELECTED_COLLECTIONS" && (
              <BlockStack gap="200">
                <Button onClick={pickCollections}>Select Collections</Button>
                <Text as="span" tone="subdued">
                  {collections.length > 0
                    ? collections.map((c) => c.title).join(", ")
                    : "No collections selected"}
                </Text>
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

            {type === "STATUS" && (
              <BlockStack gap="100">
                {STATUS_OPTIONS.map((status) => (
                  <Checkbox
                    key={status}
                    label={status}
                    checked={statuses.includes(status)}
                    onChange={(checked) =>
                      setStatuses((prev) =>
                        checked ? [...prev, status] : prev.filter((s) => s !== status),
                      )
                    }
                  />
                ))}
              </BlockStack>
            )}

            {NO_VALUE_TYPES.includes(type) && (
              <Text as="p" tone="subdued">
                {DISPLAY_RULE_TYPES.find((entry) => entry.value === type)?.description}
              </Text>
            )}

            <InlineStack gap="200">
              <Button variant="primary" onClick={handleAdd} loading={saving} disabled={isAddDisabled}>
                Add condition
              </Button>
              <Button onClick={resetDraft}>Cancel</Button>
            </InlineStack>
          </BlockStack>
        </Box>
      ) : (
        <Button onClick={() => setAdding(true)}>Add condition</Button>
      )}
    </BlockStack>
  );
}
