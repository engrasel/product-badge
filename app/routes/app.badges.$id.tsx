import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  RangeSlider,
  Checkbox,
  RadioButton,
  Tabs,
  Text,
  Tag,
  Button,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { deleteBadge, getBadge, updateBadge } from "../services/badge.service";
import { getShopPlan } from "../services/plan.service";
import { listLocations } from "../services/displayLocation.service";
import { deleteRule, upsertRule } from "../services/displayRule.service";
import { useBadgeForm } from "../hooks/useBadgeForm";
import { ColorField } from "../components/customizer/ColorField";
import { ProductPreviewCard } from "../components/badges/ProductPreviewCard";
import { RuleEditorModal } from "../components/rules/RuleEditorModal";
import { UpgradeModal } from "../components/premium/UpgradeModal";
import { PremiumLock } from "../components/premium/PremiumLock";
import {
  canUseLocation,
  canUseShape,
  type Plan,
} from "../utils/planLimits";
import {
  parseBadgeDisplayLocations,
  serializeBadgeDisplayLocations,
} from "../utils/badgeDisplayLocations";
import { formatRuleSummary } from "../utils/formatRule";
import {
  BADGE_ANIMATIONS,
  BADGE_POSITIONS,
  BADGE_SHAPES,
  DISPLAY_LOCATIONS,
} from "../utils/constants";
import type { BadgeStyleInput } from "../types/badge.types";
import type { DisplayRuleType } from "../types/rules.types";
import type { DisplayLocationKey } from "../types/locations.types";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [badge, { plan }, shopLocations] = await Promise.all([
    getBadge(session.shop, params.id as string),
    getShopPlan(session.shop),
    listLocations(session.shop),
  ]);

  if (!badge) {
    throw new Response("Badge not found", { status: 404 });
  }

  const shopEnabledLocations: Record<string, boolean> = {};
  for (const location of shopLocations) {
    shopEnabledLocations[location.key] = location.enabled;
  }

  return { badge, plan, shopEnabledLocations };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const id = params.id as string;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteBadge(session.shop, id);
    return redirect("/app/badges");
  }

  if (intent === "upsertRule") {
    const type = String(formData.get("type")) as DisplayRuleType;
    const rawValue = formData.get("value");
    const value = rawValue ? JSON.parse(String(rawValue)) : undefined;
    await upsertRule(session.shop, id, type, value);
    return { ok: true, intent };
  }

  if (intent === "deleteRule") {
    await deleteRule(session.shop, String(formData.get("ruleId")));
    return { ok: true, intent };
  }

  const readNumber = (key: string) => Number(formData.get(key) ?? 0);
  const readOptionalNumber = (key: string) => {
    const raw = formData.get(key);
    return raw && raw !== "" ? Number(raw) : null;
  };
  const readOptionalDate = (key: string) => {
    const raw = formData.get(key);
    return raw && raw !== "" ? new Date(String(raw)) : null;
  };

  const data: Partial<BadgeStyleInput> = {
    name: String(formData.get("name") ?? ""),
    isActive: formData.get("isActive") === "true",
    text: String(formData.get("text") ?? ""),
    backgroundColor: String(formData.get("backgroundColor") ?? ""),
    textColor: String(formData.get("textColor") ?? ""),
    borderColor: String(formData.get("borderColor") ?? ""),
    fontSize: readNumber("fontSize"),
    fontWeight: String(formData.get("fontWeight") ?? "600"),
    borderRadius: readNumber("borderRadius"),
    shadow: formData.get("shadow") === "true",
    opacity: readNumber("opacity"),
    rotation: readNumber("rotation"),
    paddingX: readNumber("paddingX"),
    paddingY: readNumber("paddingY"),
    width: readOptionalNumber("width"),
    height: readOptionalNumber("height"),
    shape: String(formData.get("shape")) as BadgeStyleInput["shape"],
    animation: String(formData.get("animation")) as BadgeStyleInput["animation"],
    position: String(formData.get("position")) as BadgeStyleInput["position"],
    offsetX: readNumber("offsetX"),
    offsetY: readNumber("offsetY"),
    customCss: String(formData.get("customCss") ?? "") || null,
    backgroundType: String(formData.get("backgroundType") ?? "SOLID") as BadgeStyleInput["backgroundType"],
    gradientColor1: String(formData.get("gradientColor1") ?? "") || null,
    gradientColor2: String(formData.get("gradientColor2") ?? "") || null,
    priority: readNumber("priority"),
    scheduleStart: readOptionalDate("scheduleStart"),
    scheduleEnd: readOptionalDate("scheduleEnd"),
    timezone: String(formData.get("timezone") ?? "") || null,
    displayLocations: String(formData.get("displayLocations") ?? "") || null,
    customCssCode: String(formData.get("customCssCode") ?? "") || null,
  };

  const badge = await updateBadge(session.shop, id, data);
  return { ok: true, intent: "save", badge };
};

const TABS = [
  { id: "design", content: "Design" },
  { id: "rules", content: "Products & Rules" },
  { id: "display", content: "Display" },
];

export default function BadgeWizard() {
  const { badge, plan, shopEnabledLocations } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const { values, update } = useBadgeForm(badge);
  const [tabIndex, setTabIndex] = useState(0);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isPremium: boolean = plan === "PREMIUM";
  const isSaving = fetcher.state !== "idle" && fetcher.formData?.get("intent") === undefined;

  useEffect(() => {
    if (fetcher.data?.ok && fetcher.data.intent === "save") {
      shopify.toast.show("Badge saved");
    }
  }, [fetcher.data, shopify]);

  const lockOrApply = (allowed: boolean, apply: () => void) => {
    if (!allowed) {
      setShowUpgradeModal(true);
      return;
    }
    apply();
  };

  const handleSave = () => {
    fetcher.submit(
      {
        ...values,
        width: values.width ?? "",
        height: values.height ?? "",
        customCss: values.customCss ?? "",
        gradientColor1: values.gradientColor1 ?? "",
        gradientColor2: values.gradientColor2 ?? "",
        timezone: values.timezone ?? "",
        displayLocations: values.displayLocations ?? "",
        customCssCode: values.customCssCode ?? "",
        scheduleStart: values.scheduleStart ? new Date(values.scheduleStart).toISOString() : "",
        scheduleEnd: values.scheduleEnd ? new Date(values.scheduleEnd).toISOString() : "",
      },
      { method: "post" },
    );
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${values.name}"? This can't be undone.`)) {
      return;
    }
    fetcher.submit({ intent: "delete" }, { method: "post" });
  };

  const handleSaveRule = (type: DisplayRuleType, value: unknown) => {
    fetcher.submit(
      {
        intent: "upsertRule",
        type,
        value: value !== undefined ? JSON.stringify(value) : "",
      },
      { method: "post" },
    );
    setShowRuleEditor(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    fetcher.submit({ intent: "deleteRule", ruleId }, { method: "post" });
  };

  const dateInputValue = (date: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };

  const effectiveLocations: DisplayLocationKey[] =
    parseBadgeDisplayLocations(values.displayLocations) ??
    DISPLAY_LOCATIONS.filter((location) => canUseLocation(plan as Plan, location.value)).map(
      (location) => location.value,
    );

  const toggleLocation = (key: DisplayLocationKey, checked: boolean) => {
    if (checked && !canUseLocation(plan as Plan, key)) {
      setShowUpgradeModal(true);
      return;
    }
    const next = checked
      ? [...effectiveLocations, key]
      : effectiveLocations.filter((existing) => existing !== key);
    update("displayLocations", serializeBadgeDisplayLocations(next));
  };

  return (
    <Page
      title={values.name || "Edit Badge"}
      backAction={{ content: "Badge Library", url: "/app/badges" }}
      primaryAction={{
        content: "Save",
        onAction: handleSave,
        loading: isSaving,
      }}
      secondaryActions={[
        { content: "Delete", destructive: true, onAction: handleDelete },
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Tabs tabs={TABS} selected={tabIndex} onSelect={setTabIndex} />

            {tabIndex === 0 && (
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Content
                    </Text>
                    <TextField
                      label="Badge Name"
                      value={values.name}
                      onChange={(value) => update("name", value)}
                      autoComplete="off"
                      helpText="Internal name shown in your dashboard — not displayed to customers."
                    />
                    <TextField
                      label="Badge Text"
                      value={values.text}
                      onChange={(value) => update("text", value)}
                      autoComplete="off"
                    />
                    <Checkbox
                      label="Active"
                      checked={values.isActive}
                      onChange={(checked) => update("isActive", checked)}
                      helpText="Inactive badges are saved but never shown on the storefront."
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Background
                      </Text>
                      {!isPremium && <PremiumLock />}
                    </InlineStack>
                    <InlineStack gap="400">
                      <RadioButton
                        label="Solid"
                        checked={values.backgroundType === "SOLID"}
                        onChange={() => update("backgroundType", "SOLID")}
                      />
                      <RadioButton
                        label="Gradient"
                        checked={values.backgroundType === "GRADIENT"}
                        onChange={() => lockOrApply(isPremium, () => update("backgroundType", "GRADIENT"))}
                      />
                    </InlineStack>

                    {values.backgroundType === "GRADIENT" ? (
                      <>
                        <ColorField
                          label="Gradient Color 1"
                          value={values.gradientColor1 ?? "#FF3B30"}
                          onChange={(value) => update("gradientColor1", value)}
                        />
                        <ColorField
                          label="Gradient Color 2"
                          value={values.gradientColor2 ?? "#FFD60A"}
                          onChange={(value) => update("gradientColor2", value)}
                        />
                      </>
                    ) : (
                      <ColorField
                        label="Background Color"
                        value={values.backgroundColor}
                        onChange={(value) => update("backgroundColor", value)}
                      />
                    )}
                    <ColorField
                      label="Text Color"
                      value={values.textColor}
                      onChange={(value) => update("textColor", value)}
                    />
                    <ColorField
                      label="Border Color"
                      value={values.borderColor}
                      onChange={(value) => update("borderColor", value)}
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Shape & Typography
                    </Text>
                    <Select
                      label="Shape"
                      options={BADGE_SHAPES.map((shape) => ({
                        value: shape.value,
                        label: shape.isPro && !isPremium ? `${shape.label} (Premium)` : shape.label,
                      }))}
                      value={values.shape}
                      onChange={(value) =>
                        lockOrApply(canUseShape(plan as Plan, value as BadgeStyleInput["shape"]), () =>
                          update("shape", value as BadgeStyleInput["shape"]),
                        )
                      }
                    />
                    <Select
                      label="Font Weight"
                      options={[
                        { label: "Normal (400)", value: "400" },
                        { label: "Medium (500)", value: "500" },
                        { label: "Semibold (600)", value: "600" },
                        { label: "Bold (700)", value: "700" },
                        { label: "Extra Bold (800)", value: "800" },
                      ]}
                      value={values.fontWeight}
                      onChange={(value) => update("fontWeight", value)}
                    />
                    <RangeSlider
                      label={`Font Size: ${values.fontSize}px`}
                      min={8}
                      max={32}
                      value={values.fontSize}
                      onChange={(value) => update("fontSize", value as number)}
                    />
                    <RangeSlider
                      label={`Border Radius: ${values.borderRadius}px`}
                      min={0}
                      max={50}
                      value={values.borderRadius}
                      onChange={(value) => update("borderRadius", value as number)}
                      helpText="Only applies to the Rounded shape."
                    />
                    <Checkbox
                      label="Drop shadow"
                      checked={values.shadow}
                      onChange={(checked) => update("shadow", checked)}
                    />
                    <RangeSlider
                      label={`Opacity: ${values.opacity}%`}
                      min={10}
                      max={100}
                      value={values.opacity}
                      onChange={(value) => update("opacity", value as number)}
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Size & Spacing
                    </Text>
                    <InlineStack gap="300" wrap={false}>
                      <TextField
                        label="Width (px)"
                        type="number"
                        value={values.width === null ? "" : String(values.width)}
                        onChange={(value) => update("width", value === "" ? null : Number(value))}
                        autoComplete="off"
                        placeholder="Auto"
                      />
                      <TextField
                        label="Height (px)"
                        type="number"
                        value={values.height === null ? "" : String(values.height)}
                        onChange={(value) => update("height", value === "" ? null : Number(value))}
                        autoComplete="off"
                        placeholder="Auto"
                      />
                    </InlineStack>
                    <RangeSlider
                      label={`Horizontal Padding: ${values.paddingX}px`}
                      min={0}
                      max={32}
                      value={values.paddingX}
                      onChange={(value) => update("paddingX", value as number)}
                    />
                    <RangeSlider
                      label={`Vertical Padding: ${values.paddingY}px`}
                      min={0}
                      max={32}
                      value={values.paddingY}
                      onChange={(value) => update("paddingY", value as number)}
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Position & Motion
                      </Text>
                      {!isPremium && <PremiumLock />}
                    </InlineStack>
                    <Select
                      label="Position"
                      options={BADGE_POSITIONS}
                      value={values.position}
                      onChange={(value) => update("position", value as BadgeStyleInput["position"])}
                    />
                    {values.position === "CUSTOM" && (
                      <InlineStack gap="300" wrap={false}>
                        <TextField
                          label="Offset X (px)"
                          type="number"
                          value={String(values.offsetX)}
                          onChange={(value) => update("offsetX", Number(value || 0))}
                          autoComplete="off"
                        />
                        <TextField
                          label="Offset Y (px)"
                          type="number"
                          value={String(values.offsetY)}
                          onChange={(value) => update("offsetY", Number(value || 0))}
                          autoComplete="off"
                        />
                      </InlineStack>
                    )}
                    <RangeSlider
                      label={`Rotation: ${values.rotation}°`}
                      min={-45}
                      max={45}
                      value={values.rotation}
                      onChange={(value) => update("rotation", value as number)}
                    />
                    <Select
                      label="Animation"
                      options={BADGE_ANIMATIONS.map((animation) => ({
                        value: animation.value,
                        label:
                          animation.value !== "NONE" && !isPremium
                            ? `${animation.label} (Premium)`
                            : animation.label,
                      }))}
                      value={values.animation}
                      onChange={(value) =>
                        lockOrApply(isPremium || value === "NONE", () =>
                          update("animation", value as BadgeStyleInput["animation"]),
                        )
                      }
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Advanced
                    </Text>
                    <TextField
                      label="Custom CSS Class"
                      value={values.customCss ?? ""}
                      onChange={(value) => update("customCss", value || null)}
                      autoComplete="off"
                      placeholder="my-custom-badge"
                      helpText="Adds this class to the badge element for theme-level CSS overrides."
                    />
                  </BlockStack>
                </Card>
              </BlockStack>
            )}

            {tabIndex === 1 && (
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Display Rules
                    </Text>
                    <Button onClick={() => setShowRuleEditor(true)}>Manage Rules</Button>
                  </InlineStack>

                  {badge.rules.length === 0 ? (
                    <Text as="p" tone="subdued">
                      No display rules yet — this badge won&apos;t show anywhere until you add one.
                    </Text>
                  ) : (
                    <InlineStack gap="200">
                      {badge.rules.map((rule) => (
                        <Tag key={rule.id} onRemove={() => handleDeleteRule(rule.id)}>
                          {formatRuleSummary(rule)}
                        </Tag>
                      ))}
                    </InlineStack>
                  )}

                  {plan === "FREE" && (
                    <Text as="p" tone="subdued" variant="bodySm">
                      Free plan: only All Products and Discount Products rules are available.
                      Upgrade to Premium for collection, tag, vendor, inventory, and price rules.
                    </Text>
                  )}
                </BlockStack>
              </Card>
            )}

            {tabIndex === 2 && (
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Display Locations
                    </Text>
                    <Text as="p" tone="subdued" variant="bodySm">
                      Also controlled shop-wide on the Display Locations page —
                      a location must be enabled there too for this badge to appear.
                    </Text>
                    <BlockStack gap="150">
                      {DISPLAY_LOCATIONS.map((location) => {
                        const locked = !canUseLocation(plan as Plan, location.value);
                        const shopDisabled = shopEnabledLocations[location.value] === false;
                        return (
                          <InlineStack key={location.value} align="space-between" blockAlign="center">
                            <Checkbox
                              label={location.label}
                              checked={effectiveLocations.includes(location.value)}
                              disabled={location.comingSoon}
                              onChange={(checked) => toggleLocation(location.value, checked)}
                              helpText={shopDisabled ? "Disabled shop-wide" : undefined}
                            />
                            {locked && <PremiumLock />}
                          </InlineStack>
                        );
                      })}
                    </BlockStack>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Schedule
                      </Text>
                      {!isPremium && <PremiumLock />}
                    </InlineStack>
                    <InlineStack gap="300" wrap={false}>
                      <TextField
                        label="Start date"
                        type="date"
                        value={dateInputValue(values.scheduleStart)}
                        disabled={!isPremium}
                        onChange={(value) =>
                          update("scheduleStart", value ? new Date(value) : null)
                        }
                        autoComplete="off"
                      />
                      <TextField
                        label="End date"
                        type="date"
                        value={dateInputValue(values.scheduleEnd)}
                        disabled={!isPremium}
                        onChange={(value) => update("scheduleEnd", value ? new Date(value) : null)}
                        autoComplete="off"
                      />
                    </InlineStack>
                    <TextField
                      label="Timezone"
                      value={values.timezone ?? ""}
                      disabled={!isPremium}
                      onChange={(value) => update("timezone", value || null)}
                      autoComplete="off"
                      placeholder="e.g. America/New_York"
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Display Priority
                      </Text>
                      {!isPremium && <PremiumLock />}
                    </InlineStack>
                    <RangeSlider
                      label={`Priority: ${values.priority}`}
                      min={0}
                      max={10}
                      value={values.priority}
                      disabled={!isPremium}
                      onChange={(value) => update("priority", value as number)}
                      helpText="Higher priority wins when multiple badges match the same product."
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        Custom CSS
                      </Text>
                      {!isPremium && <PremiumLock />}
                    </InlineStack>
                    <TextField
                      label="Custom CSS"
                      labelHidden
                      multiline={4}
                      value={values.customCssCode ?? ""}
                      disabled={!isPremium}
                      onChange={(value) => update("customCssCode", value || null)}
                      autoComplete="off"
                      placeholder=".product-badge { letter-spacing: 0.5px; }"
                    />
                  </BlockStack>
                </Card>
              </BlockStack>
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Live Preview
              </Text>
              <ProductPreviewCard badge={values} />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {showRuleEditor && (
        <RuleEditorModal
          badgeName={values.name}
          existingTypes={badge.rules.map((rule) => rule.type)}
          onClose={() => setShowRuleEditor(false)}
          onSave={handleSaveRule}
          saving={fetcher.state !== "idle"}
          plan={plan as Plan}
          onLockedSelect={() => setShowUpgradeModal(true)}
        />
      )}

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
