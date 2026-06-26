import { useEffect } from "react";
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
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { deleteBadge, getBadge, updateBadge } from "../services/badge.service";
import { useBadgeForm } from "../hooks/useBadgeForm";
import { ColorField } from "../components/customizer/ColorField";
import { BadgePositionPreview } from "../components/customizer/BadgePositionPreview";
import {
  BADGE_ANIMATIONS,
  BADGE_POSITIONS,
  BADGE_SHAPES,
} from "../utils/constants";
import type { BadgeStyleInput } from "../types/badge.types";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const badge = await getBadge(session.shop, params.id as string);

  if (!badge) {
    throw new Response("Badge not found", { status: 404 });
  }

  return { badge };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const id = params.id as string;
  const formData = await request.formData();

  if (formData.get("intent") === "delete") {
    await deleteBadge(session.shop, id);
    return redirect("/app/badges");
  }

  const readNumber = (key: string) => Number(formData.get(key) ?? 0);
  const readOptionalNumber = (key: string) => {
    const raw = formData.get(key);
    return raw && raw !== "" ? Number(raw) : null;
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
  };

  const badge = await updateBadge(session.shop, id, data);
  return { ok: true, badge };
};

export default function BadgeCustomizer() {
  const { badge } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const { values, update } = useBadgeForm(badge);

  const isSaving = fetcher.state !== "idle" && fetcher.formData?.get("intent") !== "delete";

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Badge saved");
    }
  }, [fetcher.data, shopify]);

  const handleSave = () => {
    fetcher.submit(
      {
        ...values,
        width: values.width ?? "",
        height: values.height ?? "",
        customCss: values.customCss ?? "",
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
                <Text as="h2" variant="headingMd">
                  Colors
                </Text>
                <ColorField
                  label="Background Color"
                  value={values.backgroundColor}
                  onChange={(value) => update("backgroundColor", value)}
                />
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
                  options={BADGE_SHAPES}
                  value={values.shape}
                  onChange={(value) => update("shape", value as BadgeStyleInput["shape"])}
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
                <Text as="h2" variant="headingMd">
                  Position & Motion
                </Text>
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
                  options={BADGE_ANIMATIONS}
                  value={values.animation}
                  onChange={(value) => update("animation", value as BadgeStyleInput["animation"])}
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
                  helpText="Future ready — adds this class to the badge element for theme-level CSS overrides."
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Live Preview
              </Text>
              <BadgePositionPreview badge={values} />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
