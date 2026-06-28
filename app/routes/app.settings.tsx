import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Select,
  Text,
  Badge as StatusBadge,
  Button,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import {
  ensureShopSettings,
  resetShopSettings,
  setShopEnabled,
  setShopLanguage,
  setShopTimezone,
} from "../services/shopSettings.service";
import { DEFAULT_BADGE_STYLE } from "../utils/constants";

const LANGUAGE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Spanish", value: "es" },
];

const TIMEZONE_OPTIONS = [
  { label: "UTC", value: "UTC" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "America/Los_Angeles", value: "America/Los_Angeles" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "Asia/Tokyo", value: "Asia/Tokyo" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await ensureShopSettings(session.shop);

  return {
    shop: session.shop,
    isEnabled: settings.isEnabled,
    language: settings.language,
    timezone: settings.timezone,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "toggleEnabled");

  if (intent === "setLanguage") {
    await setShopLanguage(session.shop, String(formData.get("language")));
    return { ok: true };
  }

  if (intent === "setTimezone") {
    const timezone = String(formData.get("timezone") ?? "");
    await setShopTimezone(session.shop, timezone || null);
    return { ok: true };
  }

  if (intent === "reset") {
    await resetShopSettings(session.shop);
    return { ok: true };
  }

  if (intent === "rebuildCache") {
    // No server-side cache to invalidate — the storefront proxy response
    // carries a 60s Cache-Control header that expires on its own. This is a
    // reassurance action, not real invalidation work.
    return { ok: true };
  }

  const isEnabled = formData.get("isEnabled") === "true";
  await setShopEnabled(session.shop, isEnabled);
  return { ok: true };
};

export default function Settings() {
  const { shop, isEnabled, language, timezone } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isToggling =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === undefined;
  const displayIsEnabled = isToggling
    ? fetcher.formData?.get("isEnabled") === "true"
    : isEnabled;

  useEffect(() => {
    if (fetcher.data?.ok) {
      const intent = fetcher.formData?.get("intent");
      if (intent === "reset") {
        shopify.toast.show("Settings reset to defaults");
      } else if (intent === "rebuildCache") {
        shopify.toast.show("Cache will refresh automatically within 60 seconds");
      } else {
        shopify.toast.show("Settings saved");
      }
    }
  }, [fetcher.data, fetcher.formData, shopify]);

  const toggleEnabled = () => {
    fetcher.submit({ isEnabled: String(!displayIsEnabled) }, { method: "post" });
  };

  const handleReset = () => {
    if (!window.confirm("Reset all app settings back to defaults?")) {
      return;
    }
    fetcher.submit({ intent: "reset" }, { method: "post" });
  };

  const handleRebuildCache = () => {
    fetcher.submit({ intent: "rebuildCache" }, { method: "post" });
  };

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  App Status
                </Text>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <StatusBadge tone={displayIsEnabled ? "success" : "critical"}>
                      {displayIsEnabled ? "Enabled" : "Disabled"}
                    </StatusBadge>
                    <Text as="p" tone="subdued" variant="bodySm">
                      When disabled, no badges render anywhere on your storefront,
                      regardless of individual badge or location settings.
                    </Text>
                  </BlockStack>
                  <Button onClick={toggleEnabled} loading={isToggling}>
                    {displayIsEnabled ? "Disable App" : "Enable App"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Default Badge Settings
                </Text>
                <Text as="p" tone="subdued">
                  New custom badges start from this default style — change anything
                  per-badge afterward in its own editor.
                </Text>
                <InlineStack gap="300" blockAlign="center">
                  <StatusBadge tone="info">{DEFAULT_BADGE_STYLE.text}</StatusBadge>
                  <Text as="span" tone="subdued">
                    {DEFAULT_BADGE_STYLE.shape} shape · {DEFAULT_BADGE_STYLE.position.replace("_", " ").toLowerCase()} ·{" "}
                    {DEFAULT_BADGE_STYLE.backgroundColor}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Language &amp; Timezone
                </Text>
                <Select
                  label="Language"
                  options={LANGUAGE_OPTIONS}
                  value={language}
                  onChange={(value) =>
                    fetcher.submit({ intent: "setLanguage", language: value }, { method: "post" })
                  }
                />
                <Select
                  label="Timezone"
                  options={TIMEZONE_OPTIONS}
                  value={timezone ?? "UTC"}
                  onChange={(value) =>
                    fetcher.submit({ intent: "setTimezone", timezone: value }, { method: "post" })
                  }
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Maintenance
                </Text>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="span" fontWeight="semibold">
                      Rebuild Badge Cache
                    </Text>
                    <Text as="span" tone="subdued" variant="bodySm">
                      Storefront badge data refreshes automatically every 60 seconds.
                    </Text>
                  </BlockStack>
                  <Button onClick={handleRebuildCache}>Rebuild Cache</Button>
                </InlineStack>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="span" fontWeight="semibold">
                      Reset Settings
                    </Text>
                    <Text as="span" tone="subdued" variant="bodySm">
                      Restores App Status, Language, and Timezone to their defaults.
                    </Text>
                  </BlockStack>
                  <Button tone="critical" onClick={handleReset}>
                    Reset Settings
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Store
                </Text>
                <Text as="p" tone="subdued">
                  Settings on this page apply to {shop} only.
                </Text>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
