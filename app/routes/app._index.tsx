import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Badge as StatusBadge,
  Button,
  EmptyState,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { ensureShopSettings, setShopEnabled } from "../services/shopSettings.service";
import { ensureDefaultLocations, listLocations } from "../services/displayLocation.service";
import { ensureDefaultBadge, listBadges, updateBadge } from "../services/badge.service";
import { getShopPlan } from "../services/plan.service";
import { BadgePreview } from "../components/badges/BadgePreview";
import { DISPLAY_RULE_TYPES } from "../utils/constants";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Idempotent — only seeds data the first time a shop has none. The two
  // touch unrelated tables, so they run in parallel rather than sequentially.
  await Promise.all([ensureDefaultBadge(shop), ensureDefaultLocations(shop)]);

  const [settings, badges, locations, plan] = await Promise.all([
    ensureShopSettings(shop),
    listBadges(shop),
    listLocations(shop),
    getShopPlan(shop),
  ]);

  return {
    isEnabled: settings.isEnabled,
    badges,
    activeBadgeCount: badges.filter((badge) => badge.isActive).length,
    enabledLocationCount: locations.filter((location) => location.enabled).length,
    totalLocationCount: locations.length,
    plan: plan.plan,
    isPremium: plan.isPremium,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggleBadgeActive") {
    const id = String(formData.get("id"));
    const isActive = formData.get("isActive") === "true";
    await updateBadge(session.shop, id, { isActive });
    return { ok: true };
  }

  const isEnabled = formData.get("isEnabled") === "true";
  await setShopEnabled(session.shop, isEnabled);

  return { ok: true, isEnabled };
};

export default function Dashboard() {
  const {
    isEnabled,
    badges,
    activeBadgeCount,
    enabledLocationCount,
    totalLocationCount,
    plan,
    isPremium,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const isToggling =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") !== "toggleBadgeActive";
  // Reflects the in-flight toggle immediately rather than waiting on the
  // round trip, falling back to the last-loaded value once settled.
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

  const toggleBadgeActive = (id: string, nextActive: boolean) => {
    fetcher.submit(
      { intent: "toggleBadgeActive", id, isActive: String(nextActive) },
      { method: "post" },
    );
  };

  return (
    <Page
      title="App Dashboard"
      primaryAction={{
        content: "Create Badge",
        onAction: () => navigate("/app/badges/custom"),
      }}
    >
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  App Status
                </Text>
                <InlineStack align="space-between" blockAlign="center">
                  <StatusBadge tone={displayIsEnabled ? "success" : "critical"}>
                    {displayIsEnabled ? "Enabled" : "Disabled"}
                  </StatusBadge>
                  <Button onClick={toggleEnabled} loading={isToggling} size="slim">
                    {displayIsEnabled ? "Disable" : "Enable"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Current Plan
                </Text>
                <InlineStack align="space-between" blockAlign="center">
                  <StatusBadge tone={isPremium ? "warning" : "success"}>
                    {plan === "PREMIUM" ? "Premium" : "Free"}
                  </StatusBadge>
                  {!isPremium && (
                    <Button onClick={() => navigate("/app/billing")} size="slim" variant="primary">
                      Upgrade
                    </Button>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Active Badges
                </Text>
                <Text as="p" variant="heading2xl">
                  {activeBadgeCount}
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm" tone="subdued">
                  Display Locations Enabled
                </Text>
                <Text as="p" variant="heading2xl">
                  {enabledLocationCount}/{totalLocationCount}
                </Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  Your Badges
                </Text>
                <Button onClick={() => navigate("/app/badges")} variant="plain">
                  Browse Badge Library
                </Button>
              </InlineStack>

              {badges.length === 0 ? (
                <EmptyState
                  heading="No badges yet"
                  action={{
                    content: "Browse Badge Library",
                    onAction: () => navigate("/app/badges"),
                  }}
                  image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
                >
                  <p>Choose a template to start showing badges on your storefront.</p>
                </EmptyState>
              ) : (
                <BlockStack gap="300">
                  {badges.map((badge) => {
                    const ruleLabel =
                      DISPLAY_RULE_TYPES.find((rule) => rule.value === badge.rules[0]?.type)
                        ?.label ?? "No rule set";

                    return (
                      <InlineStack key={badge.id} align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <BadgePreview badge={badge} />
                          <BlockStack gap="050">
                            <Text as="span" fontWeight="semibold">
                              {badge.name}
                            </Text>
                            <Text as="span" variant="bodySm" tone="subdued">
                              {ruleLabel}
                            </Text>
                          </BlockStack>
                        </InlineStack>
                        <InlineStack gap="200" blockAlign="center">
                          <StatusBadge tone={badge.isActive ? "success" : undefined}>
                            {badge.isActive ? "Active" : "Inactive"}
                          </StatusBadge>
                          <Button size="slim" onClick={() => navigate(`/app/badges/${badge.id}`)}>
                            Edit
                          </Button>
                          <Button size="slim" onClick={() => toggleBadgeActive(badge.id, !badge.isActive)}>
                            {badge.isActive ? "Disable" : "Enable"}
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    );
                  })}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Quick Actions
              </Text>
              <Button onClick={() => navigate("/app/badges")} fullWidth textAlign="left">
                Badge Library
              </Button>
              <Button onClick={() => navigate("/app/badges/custom")} fullWidth textAlign="left">
                Create Badge
              </Button>
              <Button onClick={() => navigate("/app/rules")} fullWidth textAlign="left">
                Display Rules
              </Button>
              <Button onClick={() => navigate("/app/locations")} fullWidth textAlign="left">
                Display Locations
              </Button>
              {!isPremium && (
                <Button onClick={() => navigate("/app/billing")} fullWidth textAlign="left" variant="primary">
                  Upgrade to Premium
                </Button>
              )}
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
