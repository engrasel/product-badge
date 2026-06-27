import { describe, it, expect } from "vitest";
import { evaluateBadgeRules, evaluateRule } from "./ruleEvaluation.service";
import type { DisplayRule, DisplayRuleType, RuleValueByType } from "../types/rules.types";

function rule<T extends DisplayRuleType>(type: T, value?: RuleValueByType[T]): DisplayRule {
  return {
    id: `rule-${type}`,
    shop: "test-shop.myshopify.com",
    badgeId: "badge-1",
    type,
    value: value !== undefined ? JSON.stringify(value) : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Minimal stand-in for AdminApiContext — only `.graphql()` is ever called.
type GraphqlHandler = (query: string, variables: Record<string, unknown>) => unknown;

function fakeAdmin(handler: GraphqlHandler) {
  return {
    graphql: async (query: string, options?: { variables?: Record<string, unknown> }) => {
      const data = handler(query, options?.variables ?? {});
      return { json: async () => ({ data }) } as Response;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("evaluateRule", () => {
  it("ALL_PRODUCTS matches everything without a GraphQL call", async () => {
    const admin = fakeAdmin(() => {
      throw new Error("should not call graphql for ALL_PRODUCTS");
    });
    expect(await evaluateRule(admin, rule("ALL_PRODUCTS"))).toEqual({ matchesAll: true });
  });

  it("DISCOUNT_PRODUCTS queries is_price_reduced:true", async () => {
    let capturedQuery = "";
    const admin = fakeAdmin((_query, variables) => {
      capturedQuery = String(variables.query);
      return { products: { nodes: [{ handle: "shoe-1" }, { handle: "shoe-2" }] } };
    });
    const result = await evaluateRule(admin, rule("DISCOUNT_PRODUCTS"));
    expect(capturedQuery).toBe("is_price_reduced:true");
    expect(result).toEqual({ matchesAll: false, handles: new Set(["shoe-1", "shoe-2"]) });
  });

  it("follows pageInfo.hasNextPage across multiple pages, stopping once it's false", async () => {
    let pageCount = 0;
    const admin = fakeAdmin(() => {
      pageCount += 1;
      if (pageCount === 1) {
        return {
          products: {
            pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
            nodes: [{ handle: "a" }],
          },
        };
      }
      return {
        products: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [{ handle: "b" }],
        },
      };
    });
    const result = await evaluateRule(admin, rule("DISCOUNT_PRODUCTS"));
    expect(pageCount).toBe(2);
    expect(result).toEqual({ matchesAll: false, handles: new Set(["a", "b"]) });
  });

  it("SELECTED_PRODUCTS resolves handles via nodes(ids:)", async () => {
    const admin = fakeAdmin(() => ({ nodes: [{ handle: "a" }, { handle: "b" }] }));
    const result = await evaluateRule(
      admin,
      rule("SELECTED_PRODUCTS", {
        productIds: ["gid://shopify/Product/1", "gid://shopify/Product/2"],
        productTitles: ["A", "B"],
      }),
    );
    expect(result).toEqual({ matchesAll: false, handles: new Set(["a", "b"]) });
  });

  it("SELECTED_COLLECTIONS unions products across every selected collection", async () => {
    let callCount = 0;
    const admin = fakeAdmin(() => {
      callCount += 1;
      return callCount === 1
        ? { collection: { products: { nodes: [{ handle: "a" }, { handle: "b" }] } } }
        : { collection: { products: { nodes: [{ handle: "b" }, { handle: "c" }] } } };
    });
    const result = await evaluateRule(
      admin,
      rule("SELECTED_COLLECTIONS", {
        collectionIds: ["gid://shopify/Collection/1", "gid://shopify/Collection/2"],
        collectionTitles: ["X", "Y"],
      }),
    );
    expect(result).toEqual({ matchesAll: false, handles: new Set(["a", "b", "c"]) });
  });

  it("PRODUCT_TAGS, VENDOR, and PRODUCT_TYPE build an OR query over the field", async () => {
    let capturedQuery = "";
    const admin = fakeAdmin((_q, variables) => {
      capturedQuery = String(variables.query);
      return { products: { nodes: [] } };
    });

    await evaluateRule(admin, rule("PRODUCT_TAGS", { tags: ["sale", "summer"] }));
    expect(capturedQuery).toBe("tag:'sale' OR tag:'summer'");

    await evaluateRule(admin, rule("VENDOR", { vendors: ["Acme"] }));
    expect(capturedQuery).toBe("vendor:'Acme'");

    await evaluateRule(admin, rule("PRODUCT_TYPE", { productTypes: ["Shoes", "Bags"] }));
    expect(capturedQuery).toBe("product_type:'Shoes' OR product_type:'Bags'");
  });

  it("INVENTORY_BELOW queries inventory_total:<threshold", async () => {
    let capturedQuery = "";
    const admin = fakeAdmin((_q, variables) => {
      capturedQuery = String(variables.query);
      return { products: { nodes: [] } };
    });
    await evaluateRule(admin, rule("INVENTORY_BELOW", { threshold: 5 }));
    expect(capturedQuery).toBe("inventory_total:<5");
  });

  it("PRICE_ABOVE queries variants.price:>amount", async () => {
    let capturedQuery = "";
    const admin = fakeAdmin((_q, variables) => {
      capturedQuery = String(variables.query);
      return { products: { nodes: [] } };
    });
    await evaluateRule(admin, rule("PRICE_ABOVE", { amount: 50 }));
    expect(capturedQuery).toBe("variants.price:>50");
  });

  it("NEW_PRODUCTS queries created_at against a cutoff derived from withinDays", async () => {
    let capturedQuery = "";
    const admin = fakeAdmin((_q, variables) => {
      capturedQuery = String(variables.query);
      return { products: { nodes: [] } };
    });
    await evaluateRule(admin, rule("NEW_PRODUCTS", { withinDays: 30 }));
    expect(capturedQuery).toMatch(/^created_at:>='\d{4}-\d{2}-\d{2}T/);
  });

  it("BEST_SELLING tallies line-item quantity across sampled orders and ranks by total", async () => {
    const admin = fakeAdmin(() => ({
      orders: {
        nodes: [
          {
            lineItems: {
              nodes: [
                { quantity: 3, product: { handle: "a" } },
                { quantity: 1, product: { handle: "b" } },
              ],
            },
          },
          { lineItems: { nodes: [{ quantity: 5, product: { handle: "a" } }] } },
        ],
      },
    }));
    const result = await evaluateRule(admin, rule("BEST_SELLING"));
    expect(result.matchesAll).toBe(false);
    if (!result.matchesAll) {
      // "a" (8 units) should rank above "b" (1 unit)
      expect([...result.handles]).toEqual(["a", "b"]);
    }
  });
});

describe("evaluateBadgeRules", () => {
  it("a badge with no rules never matches", async () => {
    const admin = fakeAdmin(() => ({ products: { nodes: [] } }));
    expect(await evaluateBadgeRules(admin, [])).toEqual({ matchesAll: false, handles: new Set() });
  });

  it("multiple rules AND together via set intersection", async () => {
    const admin = fakeAdmin((_q, variables) => {
      const query = String(variables.query);
      if (query.startsWith("tag:")) {
        return { products: { nodes: [{ handle: "a" }, { handle: "b" }, { handle: "c" }] } };
      }
      if (query.startsWith("vendor:")) {
        return { products: { nodes: [{ handle: "b" }, { handle: "c" }, { handle: "d" }] } };
      }
      return { products: { nodes: [] } };
    });

    const result = await evaluateBadgeRules(admin, [
      rule("PRODUCT_TAGS", { tags: ["sale"] }),
      rule("VENDOR", { vendors: ["Acme"] }),
    ]);
    expect(result.matchesAll).toBe(false);
    if (!result.matchesAll) {
      expect([...result.handles].sort()).toEqual(["b", "c"]);
    }
  });

  it("ALL_PRODUCTS acts as the identity element — combined with another rule, only that rule narrows the result", async () => {
    const admin = fakeAdmin(() => ({ products: { nodes: [{ handle: "a" }, { handle: "b" }] } }));
    const result = await evaluateBadgeRules(admin, [
      rule("ALL_PRODUCTS"),
      rule("PRODUCT_TAGS", { tags: ["sale"] }),
    ]);
    expect(result).toEqual({ matchesAll: false, handles: new Set(["a", "b"]) });
  });

  it("a lone ALL_PRODUCTS rule matches everything", async () => {
    const admin = fakeAdmin(() => {
      throw new Error("should not call graphql");
    });
    expect(await evaluateBadgeRules(admin, [rule("ALL_PRODUCTS")])).toEqual({ matchesAll: true });
  });

  it("a shared RuleCache de-dupes identical rules across two badges into one Admin API call", async () => {
    let callCount = 0;
    const admin = fakeAdmin(() => {
      callCount += 1;
      return { products: { nodes: [{ handle: "a" }] } };
    });

    const cache = new Map();
    const sameRuleOnBadgeOne = rule("PRODUCT_TAGS", { tags: ["sale"] });
    const sameRuleOnBadgeTwo = rule("PRODUCT_TAGS", { tags: ["sale"] });

    await Promise.all([
      evaluateBadgeRules(admin, [sameRuleOnBadgeOne], cache),
      evaluateBadgeRules(admin, [sameRuleOnBadgeTwo], cache),
    ]);

    expect(callCount).toBe(1);
  });
});
