import { useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useNavigation, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  Page,
  Card,
  BlockStack,
  InlineGrid,
  InlineStack,
  TextField,
  Tabs,
  EmptyState,
  Icon,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import { createBadgeFromTemplate } from "../services/badge.service";
import { BadgeCard } from "../components/badges/BadgeCard";
import { UpgradeToProModal } from "../components/badges/UpgradeToProModal";
import { BADGE_TEMPLATES } from "../utils/constants";
import type { BadgeTemplate } from "../types/badge.types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const templateKey = String(formData.get("templateKey") ?? "");

  const badge = await createBadgeFromTemplate(session.shop, templateKey);

  return redirect(`/app/badges/${badge.id}`);
};

const TABS: { id: "all" | "free" | "premium"; content: string }[] = [
  { id: "all", content: "All" },
  { id: "free", content: "Free" },
  { id: "premium", content: "Premium" },
];

export default function BadgeLibrary() {
  const submit = useSubmit();
  const navigation = useNavigation();

  const [query, setQuery] = useState("");
  const [tabIndex, setTabIndex] = useState(0);
  const [upgradeTemplate, setUpgradeTemplate] = useState<BadgeTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    const tab = TABS[tabIndex].id;
    const normalizedQuery = query.trim().toLowerCase();

    return BADGE_TEMPLATES.filter((template) => {
      const matchesQuery = template.name.toLowerCase().includes(normalizedQuery);
      const matchesTab =
        tab === "all" || (tab === "free" ? !template.isPro : template.isPro);
      return matchesQuery && matchesTab;
    });
  }, [query, tabIndex]);

  const pendingTemplateKey =
    navigation.formData?.get("templateKey")?.toString();

  const handleSelect = (template: BadgeTemplate) => {
    if (template.isPro) {
      setUpgradeTemplate(template);
      return;
    }
    submit({ templateKey: template.key }, { method: "post" });
  };

  return (
    <Page title="Badge Library">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="400" wrap={false} align="space-between" blockAlign="center">
              <div style={{ flexGrow: 1, maxWidth: 360 }}>
                <TextField
                  label="Search badges"
                  labelHidden
                  placeholder="Search badges"
                  value={query}
                  onChange={setQuery}
                  prefix={<Icon source={SearchIcon} />}
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setQuery("")}
                />
              </div>
              <Tabs tabs={TABS} selected={tabIndex} onSelect={setTabIndex} />
            </InlineStack>
          </BlockStack>
        </Card>

        {filteredTemplates.length === 0 ? (
          <Card>
            <EmptyState heading="No badges found" image="">
              <p>Try a different search term or filter.</p>
            </EmptyState>
          </Card>
        ) : (
          <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
            {filteredTemplates.map((template) => (
              <BadgeCard
                key={template.key}
                template={template}
                loading={pendingTemplateKey === template.key}
                onSelect={handleSelect}
              />
            ))}
          </InlineGrid>
        )}
      </BlockStack>

      <UpgradeToProModal
        template={upgradeTemplate}
        onClose={() => setUpgradeTemplate(null)}
      />
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
