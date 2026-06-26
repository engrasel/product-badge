export type DisplayLocationKey =
  | "COLLECTION_CARDS"
  | "FEATURED_COLLECTION"
  | "FEATURED_PRODUCTS"
  | "PRODUCT_CARDS"
  | "PRODUCT_DETAIL_PAGE"
  | "RELATED_PRODUCTS"
  | "COMPLEMENTARY_PRODUCTS"
  | "RECENTLY_VIEWED_PRODUCTS"
  | "SEARCH_RESULTS"
  | "PREDICTIVE_SEARCH"
  | "HOMEPAGE_PRODUCT_SECTIONS"
  | "COLLECTION_PAGE"
  | "CART_DRAWER";

// Mirrors the Prisma DisplayLocation model — a shop-wide ON/OFF toggle per surface.
export interface DisplayLocation {
  id: string;
  shop: string;
  key: DisplayLocationKey;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
