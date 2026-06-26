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
  Text,
  Badge as StatusBadge,
  Button,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { ensureShopSettings, setShopEnabled } from "../services/shopSettings.service";
import { listBadges } from "../services/badge.service";
import { listLocations } from "../services/displayLocation.service";
import { BADGE_TEMPLATES } from "../utils/constants";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [settings, badges, locations] = await Promise.all([
    ensureShopSettings(shop),
    listBadges(shop),
    listLocations(shop),
  ]);

  const proTemplateKeys = new Set(
    BADGE_TEMPLATES.filter((template) => template.isPro).map((template) => template.key),
  );

  return {
    shop,
    isEnabled: settings.isEnabled,
    freeBadgeCount: badges.filter((badge) => !proTemplateKeys.has(badge.templateKey)).length,
    proBadgeCount: badges.filter((badge) => proTemplateKeys.has(badge.templateKey)).length,
    enabledLocationCount: locations.filter((location) => location.enabled).length,
    totalLocationCount: locations.length,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const isEnabled = formData.get("isEnabled") === "true";

  await setShopEnabled(session.shop, isEnabled);
  return { ok: true };
};

export default function Settings() {
  const {
    shop,
    isEnabled,
    freeBadgeCount,
    proBadgeCount,
    enabledLocationCount,
    totalLocationCount,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isToggling = fetcher.state !== "idle";
  const displayIsEnabled = isToggling
    ? fetcher.formData?.get("isEnabled") === "true"
    : isEnabled;

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.data, shopify]);

  const toggleEnabled = () => {
    fetcher.submit({ isEnabled: String(!displayIsEnabled) }, { method: "post" });
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
                  Plan &amp; Usage
                </Text>
                <InlineStack align="space-between">
                  <Text as="span">Free badges in use</Text>
                  <Text as="span" fontWeight="semibold">
                    {freeBadgeCount} / 2
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span">Pro badges in use</Text>
                  <Text as="span" fontWeight="semibold">
                    {proBadgeCount} / 12
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span">Display locations enabled</Text>
                  <Text as="span" fontWeight="semibold">
                    {enabledLocationCount} / {totalLocationCount}
                  </Text>
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
