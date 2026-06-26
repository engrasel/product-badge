import type {
  BadgeAnimation,
  BadgePosition,
  BadgeShape,
  BadgeStyleInput,
  BadgeTemplate,
} from "../types/badge.types";
import type { DisplayRuleType } from "../types/rules.types";
import type { DisplayLocationKey } from "../types/locations.types";

// Factory defaults for a brand-new badge, and what's auto-created on first install
// so a new shop has a working badge instead of an empty dashboard.
export const DEFAULT_BADGE_STYLE: BadgeStyleInput = {
  name: "Sale",
  templateKey: "sale",
  isActive: true,
  text: "SALE",
  backgroundColor: "#FF3B30",
  textColor: "#FFFFFF",
  borderColor: "#FF3B30",
  fontSize: 12,
  fontWeight: "600",
  borderRadius: 4,
  shadow: false,
  opacity: 100,
  rotation: 0,
  paddingX: 8,
  paddingY: 4,
  width: null,
  height: null,
  shape: "RIBBON",
  animation: "NONE",
  position: "TOP_RIGHT",
  offsetX: 0,
  offsetY: 0,
  customCss: null,
};

export const DEFAULT_DISPLAY_RULE_TYPE: DisplayRuleType = "DISCOUNT_PRODUCTS";

export const BADGE_SHAPES: { value: BadgeShape; label: string }[] = [
  { value: "RECTANGLE", label: "Rectangle" },
  { value: "ROUNDED", label: "Rounded" },
  { value: "CIRCLE", label: "Circle" },
  { value: "RIBBON", label: "Ribbon" },
];

export const BADGE_ANIMATIONS: { value: BadgeAnimation; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "PULSE", label: "Pulse" },
  { value: "BOUNCE", label: "Bounce" },
  { value: "FADE", label: "Fade" },
  { value: "SHAKE", label: "Shake" },
];

export const BADGE_POSITIONS: { value: BadgePosition; label: string }[] = [
  { value: "TOP_LEFT", label: "Top Left" },
  { value: "TOP_RIGHT", label: "Top Right" },
  { value: "BOTTOM_LEFT", label: "Bottom Left" },
  { value: "BOTTOM_RIGHT", label: "Bottom Right" },
  { value: "CENTER", label: "Center" },
  { value: "CUSTOM", label: "Custom Offset" },
];

export const DISPLAY_RULE_TYPES: {
  value: DisplayRuleType;
  label: string;
  description: string;
}[] = [
  { value: "ALL_PRODUCTS", label: "All Products", description: "Show on every product" },
  { value: "DISCOUNT_PRODUCTS", label: "Discount Products", description: "Products with a compare-at price" },
  { value: "SELECTED_PRODUCTS", label: "Selected Products", description: "Hand-picked products" },
  { value: "SELECTED_COLLECTIONS", label: "Selected Collections", description: "Products in chosen collections" },
  { value: "PRODUCT_TAGS", label: "Products with Tags", description: "Products matching one or more tags" },
  { value: "VENDOR", label: "Products by Vendor", description: "Products from chosen vendors" },
  { value: "PRODUCT_TYPE", label: "Products by Product Type", description: "Products of a chosen type" },
  { value: "INVENTORY_BELOW", label: "Inventory Below X", description: "Low-stock products" },
  { value: "NEW_PRODUCTS", label: "New Products", description: "Recently published products" },
  { value: "BEST_SELLING", label: "Best Selling Products", description: "Top-selling products" },
];

// The Badge Library catalog — 2 free templates (no upgrade required) and 12
// Pro templates (locked behind the "Upgrade to Pro" prompt; no billing wired
// up yet). Selecting a template seeds a new Badge row with these style values;
// the merchant can then change anything in the Customizer.
export const BADGE_TEMPLATES: BadgeTemplate[] = [
  { key: "sale", name: "Sale", isPro: false, preview: { text: "SALE", backgroundColor: "#FF3B30", textColor: "#FFFFFF", borderColor: "#FF3B30", shape: "RIBBON", animation: "NONE" } },
  { key: "new", name: "New", isPro: false, preview: { text: "NEW", backgroundColor: "#34C759", textColor: "#FFFFFF", borderColor: "#34C759", shape: "ROUNDED", animation: "NONE" } },

  { key: "best-seller", name: "Best Seller", isPro: true, preview: { text: "BEST SELLER", backgroundColor: "#FFD60A", textColor: "#1C1C1E", borderColor: "#FFD60A", shape: "RIBBON", animation: "NONE" } },
  { key: "limited-stock", name: "Limited Stock", isPro: true, preview: { text: "LIMITED STOCK", backgroundColor: "#FF9500", textColor: "#FFFFFF", borderColor: "#FF9500", shape: "RECTANGLE", animation: "PULSE" } },
  { key: "trending", name: "Trending", isPro: true, preview: { text: "TRENDING", backgroundColor: "#AF52DE", textColor: "#FFFFFF", borderColor: "#AF52DE", shape: "ROUNDED", animation: "NONE" } },
  { key: "hot", name: "Hot", isPro: true, preview: { text: "HOT", backgroundColor: "#FF2D55", textColor: "#FFFFFF", borderColor: "#FF2D55", shape: "CIRCLE", animation: "PULSE" } },
  { key: "exclusive", name: "Exclusive", isPro: true, preview: { text: "EXCLUSIVE", backgroundColor: "#1C1C1E", textColor: "#FFD60A", borderColor: "#FFD60A", shape: "RECTANGLE", animation: "NONE" } },
  { key: "flash-sale", name: "Flash Sale", isPro: true, preview: { text: "FLASH SALE", backgroundColor: "#FFCC00", textColor: "#1C1C1E", borderColor: "#FFCC00", shape: "RIBBON", animation: "SHAKE" } },
  { key: "super-sale", name: "Super Sale", isPro: true, preview: { text: "SUPER SALE", backgroundColor: "#FF3B30", textColor: "#FFFFFF", borderColor: "#FF3B30", shape: "RIBBON", animation: "BOUNCE" } },
  { key: "black-friday", name: "Black Friday", isPro: true, preview: { text: "BLACK FRIDAY", backgroundColor: "#000000", textColor: "#FFFFFF", borderColor: "#FFD60A", shape: "RECTANGLE", animation: "NONE" } },
  { key: "cyber-monday", name: "Cyber Monday", isPro: true, preview: { text: "CYBER MONDAY", backgroundColor: "#0A84FF", textColor: "#FFFFFF", borderColor: "#0A84FF", shape: "RECTANGLE", animation: "NONE" } },
  { key: "summer-sale", name: "Summer Sale", isPro: true, preview: { text: "SUMMER SALE", backgroundColor: "#FF9F0A", textColor: "#FFFFFF", borderColor: "#FF9F0A", shape: "ROUNDED", animation: "NONE" } },
  { key: "limited-time", name: "Limited Time", isPro: true, preview: { text: "LIMITED TIME", backgroundColor: "#5856D6", textColor: "#FFFFFF", borderColor: "#5856D6", shape: "ROUNDED", animation: "PULSE" } },
  { key: "30-off", name: "30% OFF", isPro: true, preview: { text: "30% OFF", backgroundColor: "#FF3B30", textColor: "#FFFFFF", borderColor: "#FF3B30", shape: "CIRCLE", animation: "NONE" } },
];

export type DisplayLocationCategory = "Collections" | "Products" | "Discovery" | "Homepage" | "Cart";

export const DISPLAY_LOCATIONS: {
  value: DisplayLocationKey;
  label: string;
  category: DisplayLocationCategory;
  comingSoon?: boolean;
}[] = [
  { value: "COLLECTION_CARDS", label: "Collection Cards", category: "Collections" },
  { value: "FEATURED_COLLECTION", label: "Featured Collection", category: "Collections" },
  { value: "COLLECTION_PAGE", label: "Collection Page", category: "Collections" },

  { value: "FEATURED_PRODUCTS", label: "Featured Products", category: "Products" },
  { value: "PRODUCT_CARDS", label: "Product Cards", category: "Products" },
  { value: "PRODUCT_DETAIL_PAGE", label: "Product Detail Page", category: "Products" },

  { value: "RELATED_PRODUCTS", label: "Related Products", category: "Discovery" },
  { value: "COMPLEMENTARY_PRODUCTS", label: "Complementary Products", category: "Discovery" },
  { value: "RECENTLY_VIEWED_PRODUCTS", label: "Recently Viewed Products", category: "Discovery" },
  { value: "SEARCH_RESULTS", label: "Search Results", category: "Discovery" },
  { value: "PREDICTIVE_SEARCH", label: "Predictive Search", category: "Discovery" },

  { value: "HOMEPAGE_PRODUCT_SECTIONS", label: "Homepage Product Sections", category: "Homepage" },

  { value: "CART_DRAWER", label: "Cart Drawer", category: "Cart", comingSoon: true },
];
