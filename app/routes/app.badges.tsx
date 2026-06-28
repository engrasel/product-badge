import { useEffect, useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Card,
  BlockStack,
  InlineGrid,
  InlineStack,
  TextField,
  Select,
  Tabs,
  EmptyState,
  Icon,
  Text,
  Badge as StatusBadge,
  Button,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import {
  createBadgeFromTemplate,
  createCustomBadge,
  deleteBadge,
  duplicateBadge,
  listBadges,
  setBadgeArchived,
  updateBadge,
} from "../services/badge.service";
import { BadgeCard } from "../components/badges/BadgeCard";
import { BadgePreview } from "../components/badges/BadgePreview";
import { BADGE_TEMPLATES } from "../utils/constants";
import type { BadgeTemplate } from "../types/badge.types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const badges = await listBadges(session.shop, { includeArchived: true });
  return { badges };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "delete") {
    await deleteBadge(session.shop, String(formData.get("id")));
    return { ok: true };
  }

  if (intent === "toggleActive") {
    const id = String(formData.get("id"));
    const isActive = formData.get("isActive") === "true";
    await updateBadge(session.shop, id, { isActive });
    return { ok: true };
  }

  if (intent === "duplicate") {
    await duplicateBadge(session.shop, String(formData.get("id")));
    return { ok: true };
  }

  if (intent === "archive") {
    const id = String(formData.get("id"));
    const isArchived = formData.get("isArchived") === "true";
    await setBadgeArchived(session.shop, id, isArchived);
    return { ok: true };
  }

  // Creating a new badge from a Templates tab selection.
  const templateKey = String(formData.get("templateKey") ?? "");
  const badge =
    templateKey === "custom-badge"
      ? await createCustomBadge(session.shop)
      : await createBadgeFromTemplate(session.shop, templateKey);

  return redirect(`/app/badges/${badge.id}`);
};

const PAGE_TABS = [
  { id: "my-badges", content: "My Badges" },
  { id: "templates", content: "Templates" },
];

type StatusFilter = "all" | "active" | "inactive" | "archived";
type SortKey = "newest" | "oldest" | "name";

export default function Badges() {
  const { badges } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const submit = useSubmit();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [tabIndex, setTabIndex] = useState(0);
  const [templateQuery, setTemplateQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  useEffect(() => {
    if (fetcher.data && (fetcher.data as { ok?: boolean }).ok) {
      shopify.toast.show("Badge updated");
    }
  }, [fetcher.data, shopify]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = templateQuery.trim().toLowerCase();
    return BADGE_TEMPLATES.filter((template) =>
      template.name.toLowerCase().includes(normalizedQuery),
    );
  }, [templateQuery]);

  const pendingTemplateKey = navigation.formData?.get("templateKey")?.toString();

  const handleSelectTemplate = (template: BadgeTemplate) => {
    submit({ templateKey: template.key }, { method: "post" });
  };

  const visibleBadges = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = badges.filter((badge) => {
      const matchesQuery = badge.name.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all"
          ? !badge.isArchived
          : statusFilter === "archived"
            ? badge.isArchived
            : !badge.isArchived &&
              (statusFilter === "active" ? badge.isActive : !badge.isActive);
      return matchesQuery && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortKey === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [badges, searchQuery, statusFilter, sortKey]);

  const toggleActive = (id: string, isActive: boolean) => {
    fetcher.submit({ intent: "toggleActive", id, isActive: String(isActive) }, { method: "post" });
  };

  const duplicate = (id: string) => {
    fetcher.submit({ intent: "duplicate", id }, { method: "post" });
  };

  const toggleArchived = (id: string, isArchived: boolean) => {
    fetcher.submit({ intent: "archive", id, isArchived: String(isArchived) }, { method: "post" });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) {
      return;
    }
    fetcher.submit({ intent: "delete", id }, { method: "post" });
  };

  return (
    <Page
      title="Badges"
      primaryAction={{ content: "Create Badge", onAction: () => navigate("/app/badges/custom") }}
    >
      <BlockStack gap="400">
        <Tabs tabs={PAGE_TABS} selected={tabIndex} onSelect={setTabIndex} />

        {tabIndex === 0 ? (
          <BlockStack gap="400">
            <Card>
              <InlineStack gap="400" wrap blockAlign="center">
                <div style={{ flexGrow: 1, minWidth: 240 }}>
                  <TextField
                    label="Search badges"
                    labelHidden
                    placeholder="Search your badges"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    prefix={<Icon source={SearchIcon} />}
                    autoComplete="off"
                    clearButton
                    onClearButtonClick={() => setSearchQuery("")}
                  />
                </div>
                <div style={{ minWidth: 160 }}>
                  <Select
                    label="Status"
                    labelHidden
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as StatusFilter)}
                    options={[
                      { label: "All badges", value: "all" },
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inactive" },
                      { label: "Archived", value: "archived" },
                    ]}
                  />
                </div>
                <div style={{ minWidth: 160 }}>
                  <Select
                    label="Sort"
                    labelHidden
                    value={sortKey}
                    onChange={(value) => setSortKey(value as SortKey)}
                    options={[
                      { label: "Newest first", value: "newest" },
                      { label: "Oldest first", value: "oldest" },
                      { label: "Name (A-Z)", value: "name" },
                    ]}
                  />
                </div>
              </InlineStack>
            </Card>

            {visibleBadges.length === 0 ? (
              <Card>
                <EmptyState
                  heading={badges.length === 0 ? "No badges yet" : "No badges match your filters"}
                  action={
                    badges.length === 0
                      ? { content: "Browse Templates", onAction: () => setTabIndex(1) }
                      : undefined
                  }
                  image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
                >
                  <p>
                    {badges.length === 0
                      ? "Choose a template or create a custom badge to get started."
                      : "Try a different search term or status filter."}
                  </p>
                </EmptyState>
              </Card>
            ) : (
              <Card>
                <BlockStack gap="400">
                  {visibleBadges.map((badge) => (
                    <InlineStack key={badge.id} align="space-between" blockAlign="center" wrap={false}>
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
                      <InlineStack gap="200" blockAlign="center" wrap={false}>
                        {badge.isArchived ? (
                          <StatusBadge>Archived</StatusBadge>
                        ) : (
                          <StatusBadge tone={badge.isActive ? "success" : undefined}>
                            {badge.isActive ? "Active" : "Inactive"}
                          </StatusBadge>
                        )}
                        <Button size="slim" onClick={() => navigate(`/app/badges/${badge.id}`)}>
                          Edit
                        </Button>
                        <Button size="slim" onClick={() => duplicate(badge.id)}>
                          Duplicate
                        </Button>
                        {!badge.isArchived && (
                          <Button size="slim" onClick={() => toggleActive(badge.id, !badge.isActive)}>
                            {badge.isActive ? "Disable" : "Enable"}
                          </Button>
                        )}
                        <Button size="slim" onClick={() => toggleArchived(badge.id, !badge.isArchived)}>
                          {badge.isArchived ? "Unarchive" : "Archive"}
                        </Button>
                        <Button size="slim" tone="critical" onClick={() => handleDelete(badge.id, badge.name)}>
                          Delete
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        ) : (
          <BlockStack gap="400">
            <Card>
              <div style={{ maxWidth: 360 }}>
                <TextField
                  label="Search templates"
                  labelHidden
                  placeholder="Search templates"
                  value={templateQuery}
                  onChange={setTemplateQuery}
                  prefix={<Icon source={SearchIcon} />}
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setTemplateQuery("")}
                />
              </div>
            </Card>

            {filteredTemplates.length === 0 ? (
              <Card>
                <EmptyState heading="No templates found" image="">
                  <p>Try a different search term.</p>
                </EmptyState>
              </Card>
            ) : (
              <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
                {filteredTemplates.map((template) => (
                  <BadgeCard
                    key={template.key}
                    template={template}
                    loading={pendingTemplateKey === template.key}
                    onSelect={handleSelectTemplate}
                  />
                ))}
              </InlineGrid>
            )}
          </BlockStack>
        )}
      </BlockStack>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
