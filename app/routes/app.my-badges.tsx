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
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge as StatusBadge,
  Button,
  EmptyState,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { deleteBadge, listBadges, updateBadge } from "../services/badge.service";
import { BadgePreview } from "../components/badges/BadgePreview";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const badges = await listBadges(session.shop);
  return { badges };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = String(formData.get("id"));

  if (intent === "delete") {
    await deleteBadge(session.shop, id);
    return { ok: true };
  }

  if (intent === "toggleActive") {
    const isActive = formData.get("isActive") === "true";
    await updateBadge(session.shop, id, { isActive });
    return { ok: true };
  }

  return { ok: false };
};

export default function MyBadges() {
  const { badges } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Badge updated");
    }
  }, [fetcher.data, shopify]);

  const toggleActive = (id: string, isActive: boolean) => {
    fetcher.submit({ intent: "toggleActive", id, isActive: String(isActive) }, { method: "post" });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) {
      return;
    }
    fetcher.submit({ intent: "delete", id }, { method: "post" });
  };

  const activeCount = badges.filter((badge) => badge.isActive).length;

  return (
    <Page
      title="My Badges"
      subtitle={`${activeCount} active badge${activeCount === 1 ? "" : "s"}`}
      primaryAction={{ content: "Browse Badge Library", onAction: () => navigate("/app/badges") }}
    >
      {badges.length === 0 ? (
        <Card>
          <EmptyState
            heading="No badges yet"
            action={{ content: "Browse Badge Library", onAction: () => navigate("/app/badges") }}
            image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
          >
            <p>Choose a template to create your first badge.</p>
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <BlockStack gap="400">
            {badges.map((badge) => (
              <InlineStack key={badge.id} align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  <BadgePreview badge={badge} />
                  <BlockStack gap="050">
                    <Text as="span" fontWeight="semibold">
                      {badge.name}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {badge.rules.length} display rule{badge.rules.length === 1 ? "" : "s"}
                    </Text>
                  </BlockStack>
                </InlineStack>
                <InlineStack gap="200" blockAlign="center">
                  <StatusBadge tone={badge.isActive ? "success" : undefined}>
                    {badge.isActive ? "Active" : "Inactive"}
                  </StatusBadge>
                  <Button onClick={() => navigate(`/app/badges/${badge.id}`)}>Edit</Button>
                  <Button onClick={() => toggleActive(badge.id, !badge.isActive)}>
                    {badge.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button tone="critical" onClick={() => handleDelete(badge.id, badge.name)}>
                    Delete
                  </Button>
                </InlineStack>
              </InlineStack>
            ))}
          </BlockStack>
        </Card>
      )}
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
