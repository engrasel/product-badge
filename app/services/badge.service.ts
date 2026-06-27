import prisma from "../db.server";
import type { Badge, BadgeStyleInput } from "../types/badge.types";
import type { DisplayRule } from "../types/rules.types";
import {
  BADGE_TEMPLATES,
  DEFAULT_BADGE_STYLE,
  DEFAULT_DISPLAY_RULE_TYPE,
} from "../utils/constants";
import { getShopPlan } from "./plan.service";
import {
  FREE_LOCATIONS,
  FREE_SHAPES,
  canUseTemplate,
  isAtFreeBadgeLimit,
} from "../utils/planLimits";
import {
  parseBadgeDisplayLocations,
  serializeBadgeDisplayLocations,
} from "../utils/badgeDisplayLocations";

type BadgeWithRules = Badge & { rules: DisplayRule[] };

// SQLite stores shape/animation/position/rule type as plain strings (Prisma has
// no enum support on SQLite). This is the one place that trusts the DB and casts
// them back to the narrow union types — every caller downstream gets a fully
// typed domain object.
function toDomain(row: unknown): BadgeWithRules {
  return row as BadgeWithRules;
}

export async function listBadges(shop: string): Promise<BadgeWithRules[]> {
  const rows = await prisma.badge.findMany({
    where: { shop },
    include: { rules: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toDomain);
}

export async function getBadge(
  shop: string,
  id: string,
): Promise<BadgeWithRules | null> {
  const row = await prisma.badge.findFirst({
    where: { shop, id },
    include: { rules: true },
  });
  return row ? toDomain(row) : null;
}

export async function deleteBadge(shop: string, id: string) {
  return prisma.badge.deleteMany({ where: { shop, id } });
}

// Strips/clamps premium-only fields back to their free-plan-safe defaults.
// Called on every write so a free shop's data can never carry premium state —
// whether from a stale client, a direct request, or a downgrade after a
// cancelled subscription.
function sanitizeForFreePlan(data: Partial<BadgeStyleInput>): Partial<BadgeStyleInput> {
  const sanitized: Partial<BadgeStyleInput> = { ...data };

  if (sanitized.backgroundType !== undefined) sanitized.backgroundType = "SOLID";
  if (sanitized.gradientColor1 !== undefined) sanitized.gradientColor1 = null;
  if (sanitized.gradientColor2 !== undefined) sanitized.gradientColor2 = null;
  if (sanitized.shape !== undefined && !FREE_SHAPES.includes(sanitized.shape)) {
    sanitized.shape = "RIBBON";
  }
  if (sanitized.animation !== undefined) sanitized.animation = "NONE";
  if (sanitized.priority !== undefined) sanitized.priority = 0;
  if (sanitized.scheduleStart !== undefined) sanitized.scheduleStart = null;
  if (sanitized.scheduleEnd !== undefined) sanitized.scheduleEnd = null;
  if (sanitized.timezone !== undefined) sanitized.timezone = null;
  if (sanitized.customCssCode !== undefined) sanitized.customCssCode = null;
  if (sanitized.displayLocations !== undefined) {
    const requested = parseBadgeDisplayLocations(sanitized.displayLocations);
    const allowed = requested
      ? requested.filter((key) => FREE_LOCATIONS.includes(key))
      : FREE_LOCATIONS;
    sanitized.displayLocations = serializeBadgeDisplayLocations(allowed);
  }

  return sanitized;
}

// Verifies the badge belongs to `shop` before writing, so one shop can never
// edit another shop's badge by guessing its id.
export async function updateBadge(
  shop: string,
  id: string,
  data: Partial<BadgeStyleInput>,
): Promise<BadgeWithRules> {
  const existing = await prisma.badge.findFirst({ where: { shop, id } });
  if (!existing) {
    throw new Error("Badge not found");
  }

  const { plan } = await getShopPlan(shop);
  const safeData = plan === "FREE" ? sanitizeForFreePlan(data) : data;

  const updated = await prisma.badge.update({
    where: { id },
    data: safeData,
    include: { rules: true },
  });

  return toDomain(updated);
}

async function assertCanCreateBadge(shop: string) {
  const { plan } = await getShopPlan(shop);
  const activeCount = await prisma.badge.count({ where: { shop, isActive: true } });
  if (isAtFreeBadgeLimit(plan, activeCount)) {
    throw new Error(
      "You've reached the Free plan limit of 2 active badges. Upgrade to Premium for unlimited badges.",
    );
  }
  return plan;
}

// "Custom Badge" nav entry — starts a brand-new badge from scratch (not from
// a library template) and drops the merchant straight into the Customizer.
// The custom designer itself is a Premium feature (spec: "No custom badge
// designer" on Free), so this throws for free shops rather than silently
// creating a badge they can't fully configure.
export async function createCustomBadge(shop: string) {
  const plan = await assertCanCreateBadge(shop);
  if (plan === "FREE") {
    throw new Error("Custom badge design is a Premium feature. Upgrade to Premium to use it.");
  }

  const badge = await prisma.badge.create({
    data: {
      shop,
      ...DEFAULT_BADGE_STYLE,
      name: "Custom Badge",
      templateKey: "custom",
      text: "BADGE",
    },
    include: { rules: true },
  });

  return toDomain(badge);
}

// Creates a new Badge from a Badge Library template. Free templates only —
// premium templates are gated client-side by the Upgrade modal, but we
// re-check here since a request body can't be trusted.
export async function createBadgeFromTemplate(shop: string, templateKey: string) {
  const template = BADGE_TEMPLATES.find((candidate) => candidate.key === templateKey);
  if (!template) {
    throw new Error(`Unknown badge template: ${templateKey}`);
  }

  const plan = await assertCanCreateBadge(shop);
  if (!canUseTemplate(plan, template.key, template.isPro)) {
    throw new Error(`"${template.name}" is a Premium template and cannot be selected on the Free plan`);
  }

  const badge = await prisma.badge.create({
    data: {
      shop,
      ...DEFAULT_BADGE_STYLE,
      name: template.name,
      templateKey: template.key,
      text: template.preview.text,
      backgroundColor: template.preview.backgroundColor,
      textColor: template.preview.textColor,
      borderColor: template.preview.borderColor,
      shape: template.preview.shape,
      animation: template.preview.animation,
    },
    include: { rules: true },
  });

  return toDomain(badge);
}

// Auto-seeds the spec's default badge (Sale / #FF3B30 / Ribbon / Top Right /
// Discount Products) the first time a shop has no badges, so the dashboard
// shows something live instead of an empty state on a fresh install.
export async function ensureDefaultBadge(shop: string) {
  const count = await prisma.badge.count({ where: { shop } });
  if (count > 0) {
    return;
  }

  await prisma.badge.create({
    data: {
      shop,
      ...DEFAULT_BADGE_STYLE,
      rules: {
        create: [{ shop, type: DEFAULT_DISPLAY_RULE_TYPE }],
      },
    },
  });
}
