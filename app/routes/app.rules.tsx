import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Page, Card, BlockStack, InlineStack, Text, EmptyState } from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { listBadges } from "../services/badge.service";
import { createRule, deleteRule, setBadgeMatchType } from "../services/displayRule.service";
import { BadgePreview } from "../components/badges/BadgePreview";
import { RuleBuilder } from "../components/rules/RuleBuilder";
import type { DisplayRuleType } from "../types/rules.types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const badges = await listBadges(session.shop);
  return { badges };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "deleteRule") {
    await deleteRule(session.shop, String(formData.get("ruleId")));
    return { ok: true };
  }

  if (intent === "setMatchType") {
    const badgeId = String(formData.get("badgeId"));
    const matchType = String(formData.get("matchType")) as "ALL" | "ANY";
    await setBadgeMatchType(session.shop, badgeId, matchType);
    return { ok: true };
  }

  const badgeId = String(formData.get("badgeId"));
  const type = String(formData.get("type")) as DisplayRuleType;
  const rawValue = formData.get("value");
  const value = rawValue ? JSON.parse(String(rawValue)) : undefined;

  await createRule(session.shop, badgeId, type, value);
  return { ok: true };
};

export default function DisplayRules() {
  const { badges } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.data && (fetcher.data as { ok?: boolean }).ok) {
      shopify.toast.show("Display rules updated");
    }
  }, [fetcher.data, shopify]);

  const handleAddRule = (badgeId: string, type: DisplayRuleType, value: unknown) => {
    fetcher.submit(
      {
        intent: "addRule",
        badgeId,
        type,
        value: value !== undefined ? JSON.stringify(value) : "",
      },
      { method: "post" },
    );
  };

  const handleRemoveRule = (ruleId: string) => {
    fetcher.submit({ intent: "deleteRule", ruleId }, { method: "post" });
  };

  const handleChangeMatchType = (badgeId: string, matchType: "ALL" | "ANY") => {
    fetcher.submit({ intent: "setMatchType", badgeId, matchType }, { method: "post" });
  };

  return (
    <Page title="Display Rules">
      <BlockStack gap="400">
        {badges.length === 0 ? (
          <Card>
            <EmptyState
              heading="No badges yet"
              action={{ content: "Browse Templates", onAction: () => navigate("/app/badges") }}
              image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
            >
              <p>Create a badge first, then decide which products it shows on here.</p>
            </EmptyState>
          </Card>
        ) : (
          badges.map((badge) => (
            <Card key={badge.id}>
              <BlockStack gap="300">
                <InlineStack gap="300" blockAlign="center">
                  <BadgePreview badge={badge} />
                  <Text as="h3" variant="headingMd">
                    {badge.name}
                  </Text>
                </InlineStack>

                <RuleBuilder
                  rules={badge.rules}
                  matchType={badge.matchType}
                  onChangeMatchType={(matchType) => handleChangeMatchType(badge.id, matchType)}
                  onAddRule={(type, value) => handleAddRule(badge.id, type, value)}
                  onRemoveRule={handleRemoveRule}
                  saving={fetcher.state !== "idle"}
                />
              </BlockStack>
            </Card>
          ))
        )}
      </BlockStack>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
