import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { DisplayRule, RuleValueByType } from "../types/rules.types";

type AdminContext = AdminApiContext;

export type RuleEvaluation =
  | { matchesAll: true }
  | { matchesAll: false; handles: Set<string> };

// Shares results across rules within one storefront-config request: several
// badges referencing the identical rule (same type + value — e.g. two badges
// both keyed off the same "Black Friday" collection) hit the Admin API once,
// not once per badge. Caller creates one Map per request and passes it to
// every evaluateRule/evaluateBadgeRules call; omit it and a throwaway Map is
// used (no caching, but still correct) — keeps direct unit tests simple.
export type RuleCache = Map<string, Promise<RuleEvaluation>>;

// Admin search connections cap a single page at 250 results; PRODUCT_PAGES
// follows pageInfo.hasNextPage to go beyond that, bounded by a safety cap
// rather than paginating without limit.
const PAGE_SIZE = 250;
const MAX_PAGES = 4; // up to 1,000 matching products per rule
const BEST_SELLING_WINDOW_DAYS = 30;
const BEST_SELLING_ORDER_SAMPLE = 100;
const BEST_SELLING_TOP_N = 20;

function parseValue<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Builds a `field:'a' OR field:'b'` Admin search query fragment.
function orQuery(field: string, values: string[]): string | null {
  const cleaned = values.map((value) => value.replace(/'/g, "")).filter(Boolean);
  if (cleaned.length === 0) {
    return null;
  }
  return cleaned.map((value) => `${field}:'${value}'`).join(" OR ");
}

interface ProductConnectionPage {
  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
  nodes?: { handle: string }[];
}

async function fetchHandlesByQuery(
  admin: AdminContext,
  query: string,
): Promise<Set<string>> {
  const handles = new Set<string>();
  let after: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    // Resolved to a concrete type before the call so the generic graphql()
    // signature isn't inferring against a still-mutating `let` binding.
    const variables: { query: string; first: number; after: string | null } = {
      query,
      first: PAGE_SIZE,
      after,
    };
    const response = await admin.graphql(
      `#graphql
      query ProductHandlesByQuery($query: String, $first: Int!, $after: String) {
        products(first: $first, query: $query, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { handle }
        }
      }`,
      { variables },
    );
    const { data } = await response.json();
    const connection: ProductConnectionPage | undefined = data?.products;

    for (const node of connection?.nodes ?? []) {
      handles.add(node.handle);
    }
    if (!connection?.pageInfo?.hasNextPage) {
      break;
    }
    after = connection.pageInfo.endCursor ?? null;
  }

  return handles;
}

async function fetchHandlesByIds(
  admin: AdminContext,
  gids: string[],
): Promise<Set<string>> {
  if (gids.length === 0) {
    return new Set();
  }
  const response = await admin.graphql(
    `#graphql
    query ProductHandlesByIds($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product { handle }
      }
    }`,
    { variables: { ids: gids } },
  );
  const { data } = await response.json();
  return new Set<string>(
    (data?.nodes ?? [])
      .filter((node: { handle?: string } | null) => node?.handle)
      .map((node: { handle: string }) => node.handle),
  );
}

async function fetchHandlesForOneCollection(
  admin: AdminContext,
  collectionId: string,
): Promise<Set<string>> {
  const handles = new Set<string>();
  let after: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const variables: { id: string; first: number; after: string | null } = {
      id: collectionId,
      first: PAGE_SIZE,
      after,
    };
    const response = await admin.graphql(
      `#graphql
      query ProductHandlesByCollection($id: ID!, $first: Int!, $after: String) {
        collection(id: $id) {
          products(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes { handle }
          }
        }
      }`,
      { variables },
    );
    const { data } = await response.json();
    const connection: ProductConnectionPage | undefined = data?.collection?.products;

    for (const node of connection?.nodes ?? []) {
      handles.add(node.handle);
    }
    if (!connection?.pageInfo?.hasNextPage) {
      break;
    }
    after = connection.pageInfo.endCursor ?? null;
  }

  return handles;
}

async function fetchHandlesByCollectionIds(
  admin: AdminContext,
  gids: string[],
): Promise<Set<string>> {
  if (gids.length === 0) {
    return new Set();
  }
  const pages = await Promise.all(gids.map((id) => fetchHandlesForOneCollection(admin, id)));

  const handles = new Set<string>();
  for (const page of pages) {
    for (const handle of page) {
      handles.add(handle);
    }
  }
  return handles;
}

// The Admin API has no catalog-wide "best selling" sort (that sort key only
// exists for products inside a single collection), so this aggregates recent
// orders ourselves: tallies line-item quantity per product across a sample of
// the last 30 days' orders and takes the top 20. A real-scale version would
// precompute this on a schedule instead of live per storefront request —
// a deliberately out-of-scope improvement beyond what this phase covers.
async function fetchBestSellingHandles(admin: AdminContext): Promise<Set<string>> {
  const cutoff = new Date(
    Date.now() - BEST_SELLING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const response = await admin.graphql(
    `#graphql
    query RecentOrdersForBestSelling($query: String, $first: Int!) {
      orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
        nodes {
          lineItems(first: 50) {
            nodes { quantity product { handle } }
          }
        }
      }
    }`,
    { variables: { query: `created_at:>='${cutoff}'`, first: BEST_SELLING_ORDER_SAMPLE } },
  );
  const { data } = await response.json();

  const quantityByHandle = new Map<string, number>();
  for (const order of data?.orders?.nodes ?? []) {
    for (const lineItem of order.lineItems?.nodes ?? []) {
      const handle = lineItem.product?.handle;
      if (!handle) continue;
      quantityByHandle.set(handle, (quantityByHandle.get(handle) ?? 0) + lineItem.quantity);
    }
  }

  return new Set(
    [...quantityByHandle.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, BEST_SELLING_TOP_N)
      .map(([handle]) => handle),
  );
}

async function evaluateRuleUncached(
  admin: AdminContext,
  rule: DisplayRule,
): Promise<RuleEvaluation> {
  switch (rule.type) {
    case "ALL_PRODUCTS":
      return { matchesAll: true };

    case "DISCOUNT_PRODUCTS":
      return {
        matchesAll: false,
        handles: await fetchHandlesByQuery(admin, "is_price_reduced:true"),
      };

    case "SELECTED_PRODUCTS": {
      const value = parseValue<RuleValueByType["SELECTED_PRODUCTS"]>(rule.value);
      return {
        matchesAll: false,
        handles: await fetchHandlesByIds(admin, value?.productIds ?? []),
      };
    }

    case "SELECTED_COLLECTIONS": {
      const value = parseValue<RuleValueByType["SELECTED_COLLECTIONS"]>(rule.value);
      return {
        matchesAll: false,
        handles: await fetchHandlesByCollectionIds(admin, value?.collectionIds ?? []),
      };
    }

    case "PRODUCT_TAGS": {
      const value = parseValue<RuleValueByType["PRODUCT_TAGS"]>(rule.value);
      const query = orQuery("tag", value?.tags ?? []);
      return { matchesAll: false, handles: query ? await fetchHandlesByQuery(admin, query) : new Set() };
    }

    case "VENDOR": {
      const value = parseValue<RuleValueByType["VENDOR"]>(rule.value);
      const query = orQuery("vendor", value?.vendors ?? []);
      return { matchesAll: false, handles: query ? await fetchHandlesByQuery(admin, query) : new Set() };
    }

    case "PRODUCT_TYPE": {
      const value = parseValue<RuleValueByType["PRODUCT_TYPE"]>(rule.value);
      const query = orQuery("product_type", value?.productTypes ?? []);
      return { matchesAll: false, handles: query ? await fetchHandlesByQuery(admin, query) : new Set() };
    }

    case "INVENTORY_BELOW": {
      const value = parseValue<RuleValueByType["INVENTORY_BELOW"]>(rule.value);
      const threshold = value?.threshold ?? 0;
      return {
        matchesAll: false,
        handles: await fetchHandlesByQuery(admin, `inventory_total:<${threshold}`),
      };
    }

    case "NEW_PRODUCTS": {
      const value = parseValue<RuleValueByType["NEW_PRODUCTS"]>(rule.value);
      const withinDays = value?.withinDays ?? 30;
      const cutoff = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
      return {
        matchesAll: false,
        handles: await fetchHandlesByQuery(admin, `created_at:>='${cutoff}'`),
      };
    }

    case "BEST_SELLING":
      return { matchesAll: false, handles: await fetchBestSellingHandles(admin) };

    case "PRICE_ABOVE": {
      const value = parseValue<RuleValueByType["PRICE_ABOVE"]>(rule.value);
      const amount = value?.amount ?? 0;
      return {
        matchesAll: false,
        handles: await fetchHandlesByQuery(admin, `variants.price:>${amount}`),
      };
    }

    case "STATUS": {
      const value = parseValue<RuleValueByType["STATUS"]>(rule.value);
      const query = orQuery("status", (value?.statuses ?? []).map((status) => status.toLowerCase()));
      return { matchesAll: false, handles: query ? await fetchHandlesByQuery(admin, query) : new Set() };
    }
  }
}

function cacheKey(rule: DisplayRule): string {
  return `${rule.type}:${rule.value ?? ""}`;
}

export async function evaluateRule(
  admin: AdminContext,
  rule: DisplayRule,
  cache: RuleCache = new Map(),
): Promise<RuleEvaluation> {
  const key = cacheKey(rule);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  // Cache the in-flight promise (not just the resolved value) so concurrent
  // callers awaiting the same key share one request instead of racing.
  const evaluation = evaluateRuleUncached(admin, rule);
  cache.set(key, evaluation);
  return evaluation;
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const value of a) {
    if (b.has(value)) {
      result.add(value);
    }
  }
  return result;
}

// A badge's rules combine according to its matchType: "ALL" AND's every rule
// together (e.g. "Selected Collections" + "Inventory Below X" narrows to
// products satisfying both); "ANY" OR's them (matches a product satisfying
// at least one). A rule-less badge never shows. Rules within a badge are
// evaluated in parallel since neither intersection nor union cares about order.
export async function evaluateBadgeRules(
  admin: AdminContext,
  rules: DisplayRule[],
  matchType: "ALL" | "ANY",
  cache: RuleCache = new Map(),
): Promise<RuleEvaluation> {
  if (rules.length === 0) {
    return { matchesAll: false, handles: new Set() };
  }

  const results = await Promise.all(rules.map((rule) => evaluateRule(admin, rule, cache)));

  if (matchType === "ANY") {
    if (results.some((result) => result.matchesAll)) {
      return { matchesAll: true };
    }
    const union = new Set<string>();
    for (const result of results) {
      if (result.matchesAll) continue;
      for (const handle of result.handles) {
        union.add(handle);
      }
    }
    return { matchesAll: false, handles: union };
  }

  let matchesAll = false;
  let intersection: Set<string> | null = null;

  for (const result of results) {
    if (result.matchesAll) {
      matchesAll = true;
      continue;
    }
    intersection = intersection === null ? result.handles : intersect(intersection, result.handles);
  }

  if (intersection === null) {
    return matchesAll ? { matchesAll: true } : { matchesAll: false, handles: new Set() };
  }

  return { matchesAll: false, handles: intersection };
}
