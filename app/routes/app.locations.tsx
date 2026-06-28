import { useEffect, useState } from "react";
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
  Checkbox,
  Collapsible,
  Text,
  Badge as StatusBadge,
  Button,
} from "@shopify/polaris";
import { ChevronDownIcon, ChevronUpIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import {
  ensureDefaultLocations,
  listLocations,
  setLocationEnabled,
} from "../services/displayLocation.service";
import {
  DISPLAY_LOCATIONS,
  type DisplayLocationCategory,
} from "../utils/constants";
import type { DisplayLocationKey } from "../types/locations.types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  await ensureDefaultLocations(session.shop);
  const locations = await listLocations(session.shop);

  const enabledByKey: Record<string, boolean> = {};
  for (const location of locations) {
    enabledByKey[location.key] = location.enabled;
  }

  return { enabledByKey };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const key = String(formData.get("key"));
  const enabled = formData.get("enabled") === "true";

  await setLocationEnabled(session.shop, key, enabled);
  return { ok: true };
};

const CATEGORIES: DisplayLocationCategory[] = [
  "Collections",
  "Products",
  "Discovery",
  "Homepage",
  "Cart",
];

export default function DisplayLocations() {
  const { enabledByKey } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((category) => [category, true])),
  );

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Display locations updated");
    }
  }, [fetcher.data, shopify]);

  const pendingKey = fetcher.formData?.get("key")?.toString();
  const pendingValue = fetcher.formData?.get("enabled") === "true";

  const isEnabled = (key: DisplayLocationKey) =>
    pendingKey === key ? pendingValue : (enabledByKey[key] ?? true);

  const toggle = (key: DisplayLocationKey, enabled: boolean) => {
    fetcher.submit({ key, enabled: String(enabled) }, { method: "post" });
  };

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <Page title="Display Locations">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {CATEGORIES.map((category) => {
              const isOpen = openCategories[category] ?? true;
              return (
                <Card key={category}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        {category}
                      </Text>
                      <Button
                        variant="plain"
                        onClick={() => toggleCategory(category)}
                        icon={isOpen ? ChevronUpIcon : ChevronDownIcon}
                        accessibilityLabel={`Toggle ${category}`}
                      />
                    </InlineStack>
                    <Collapsible id={`category-${category}`} open={isOpen}>
                      <BlockStack gap="200">
                        {DISPLAY_LOCATIONS.filter((location) => location.category === category).map(
                          (location) => (
                            <InlineStack
                              key={location.value}
                              align="space-between"
                              blockAlign="center"
                            >
                              <Checkbox
                                label={location.label}
                                checked={isEnabled(location.value)}
                                disabled={location.comingSoon}
                                onChange={(checked) => toggle(location.value, checked)}
                              />
                              {location.comingSoon && <StatusBadge>Coming soon</StatusBadge>}
                            </InlineStack>
                          ),
                        )}
                      </BlockStack>
                    </Collapsible>
                  </BlockStack>
                </Card>
              );
            })}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                About Display Locations
              </Text>
              <Text as="p" tone="subdued">
                Each toggle controls a storefront surface, independent of any
                single badge. A badge still needs at least one Display Rule
                (set on the Display Rules page) to actually show up — these
                toggles just decide where it&apos;s allowed to appear once it does.
              </Text>
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
