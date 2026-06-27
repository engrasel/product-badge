import { useEffect, useState } from "react";
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
  Button,
  Tag,
  EmptyState,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { listBadges } from "../services/badge.service";
import { deleteRule, upsertRule } from "../services/displayRule.service";
import { getShopPlan } from "../services/plan.service";
import { BadgePreview } from "../components/badges/BadgePreview";
import { RuleEditorModal } from "../components/rules/RuleEditorModal";
import { UpgradeModal } from "../components/premium/UpgradeModal";
import { formatRuleSummary } from "../utils/formatRule";
import type { DisplayRuleType } from "../types/rules.types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [badges, { plan }] = await Promise.all([
    listBadges(session.shop),
    getShopPlan(session.shop),
  ]);
  return { badges, plan };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "deleteRule") {
    await deleteRule(session.shop, String(formData.get("ruleId")));
    return { ok: true };
  }

  const badgeId = String(formData.get("badgeId"));
  const type = String(formData.get("type")) as DisplayRuleType;
  const rawValue = formData.get("value");
  const value = rawValue ? JSON.parse(String(rawValue)) : undefined;

  await upsertRule(session.shop, badgeId, type, value);
  return { ok: true };
};

export default function DisplayRules() {
  const { badges, plan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (fetcher.data?.ok) {
      shopify.toast.show("Display rules updated");
      setEditingBadgeId(null);
    }
  }, [fetcher.data, shopify]);

  const editingBadge = badges.find((badge) => badge.id === editingBadgeId) ?? null;

  const handleSaveRule = (type: DisplayRuleType, value: unknown) => {
    fetcher.submit(
      {
        intent: "upsertRule",
        badgeId: editingBadgeId ?? "",
        type,
        value: value !== undefined ? JSON.stringify(value) : "",
      },
      { method: "post" },
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    fetcher.submit({ intent: "deleteRule", ruleId }, { method: "post" });
  };

  return (
    <Page title="Display Rules">
      <BlockStack gap="400">
        {badges.length === 0 ? (
          <Card>
            <EmptyState
              heading="No badges yet"
              action={{ content: "Browse Badge Library", onAction: () => navigate("/app/badges") }}
              image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
            >
              <p>Create a badge first, then decide which products it shows on here.</p>
            </EmptyState>
          </Card>
        ) : (
          badges.map((badge) => (
            <Card key={badge.id}>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <BadgePreview badge={badge} />
                    <Text as="h3" variant="headingMd">
                      {badge.name}
                    </Text>
                  </InlineStack>
                  <Button onClick={() => setEditingBadgeId(badge.id)}>Add Rule</Button>
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
              </BlockStack>
            </Card>
          ))
        )}
      </BlockStack>

      {editingBadge && (
        <RuleEditorModal
          badgeName={editingBadge.name}
          existingTypes={editingBadge.rules.map((rule) => rule.type)}
          onClose={() => setEditingBadgeId(null)}
          onSave={handleSaveRule}
          saving={fetcher.state !== "idle"}
          plan={plan}
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
