import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { listBadges } from "./badge.service";
import { listLocations } from "./displayLocation.service";
import { ensureShopSettings } from "./shopSettings.service";
import { evaluateBadgeRules, type RuleCache } from "./ruleEvaluation.service";
import { parseBadgeDisplayLocations } from "../utils/badgeDisplayLocations";
import type { Badge, BadgeStyleInput } from "../types/badge.types";
import type { DisplayRule } from "../types/rules.types";
import type { DisplayLocationKey } from "../types/locations.types";

type AdminContext = AdminApiContext;

export interface StorefrontBadge {
  id: string;
  style: BadgeStyleInput;
  matchesAllProducts: boolean;
  productHandles: string[];
  /** null means "every shop-enabled location" (see Badge.displayLocations). */
  locations: DisplayLocationKey[] | null;
}

function isWithinSchedule(badge: Badge, now: Date): boolean {
  if (badge.scheduleStart && now < badge.scheduleStart) return false;
  if (badge.scheduleEnd && now > badge.scheduleEnd) return false;
  return true;
}

export interface StorefrontConfig {
  enabled: boolean;
  locations: Record<string, boolean>;
  badges: StorefrontBadge[];
}

function toStyleInput(badge: Badge): BadgeStyleInput {
  return {
    name: badge.name,
    templateKey: badge.templateKey,
    isActive: badge.isActive,
    text: badge.text,
    backgroundColor: badge.backgroundColor,
    textColor: badge.textColor,
    borderColor: badge.borderColor,
    fontSize: badge.fontSize,
    fontWeight: badge.fontWeight,
    borderRadius: badge.borderRadius,
    shadow: badge.shadow,
    opacity: badge.opacity,
    rotation: badge.rotation,
    paddingX: badge.paddingX,
    paddingY: badge.paddingY,
    width: badge.width,
    height: badge.height,
    shape: badge.shape,
    animation: badge.animation,
    position: badge.position,
    offsetX: badge.offsetX,
    offsetY: badge.offsetY,
    customCss: badge.customCss,
    backgroundType: badge.backgroundType,
    gradientColor1: badge.gradientColor1,
    gradientColor2: badge.gradientColor2,
    priority: badge.priority,
    scheduleStart: badge.scheduleStart,
    scheduleEnd: badge.scheduleEnd,
    timezone: badge.timezone,
    displayLocations: badge.displayLocations,
    customCssCode: badge.customCssCode,
  };
}

// Assembles the single JSON payload the storefront renderer fetches through
// the App Proxy: whether the app is enabled at all, which Display Locations
// are toggled on, and — for every active badge — its style plus the resolved
// set of product handles its Display Rules currently match.
export async function getStorefrontConfig(
  shop: string,
  admin: AdminContext,
): Promise<StorefrontConfig> {
  const settings = await ensureShopSettings(shop);
  if (!settings.isEnabled) {
    return { enabled: false, locations: {}, badges: [] };
  }

  const [locations, badges] = await Promise.all([
    listLocations(shop),
    listBadges(shop),
  ]);

  const locationMap: Record<string, boolean> = {};
  for (const location of locations) {
    locationMap[location.key] = location.enabled;
  }

  const now = new Date();
  const activeBadges = badges
    .filter((badge) => badge.isActive && badge.rules.length > 0 && isWithinSchedule(badge, now))
    // Higher priority wins when multiple badges match the same product —
    // the storefront renderer picks the first match in array order.
    .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());

  // Shared across every badge in this request: two badges referencing the
  // same rule (identical type + value) hit the Admin API once between them.
  const ruleCache: RuleCache = new Map();

  const resolved = await Promise.all(
    activeBadges.map(async (badge): Promise<StorefrontBadge | null> => {
      const evaluation = await evaluateBadgeRules(
        admin,
        badge.rules as DisplayRule[],
        ruleCache,
      );
      if (!evaluation.matchesAll && evaluation.handles.size === 0) {
        return null;
      }
      return {
        id: badge.id,
        style: toStyleInput(badge),
        matchesAllProducts: evaluation.matchesAll,
        productHandles: evaluation.matchesAll ? [] : [...evaluation.handles],
        locations: parseBadgeDisplayLocations(badge.displayLocations),
      };
    }),
  );

  return {
    enabled: true,
    locations: locationMap,
    badges: resolved.filter((badge): badge is StorefrontBadge => badge !== null),
  };
}
