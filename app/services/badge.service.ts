import prisma from "../db.server";
import type { Badge, BadgeStyleInput } from "../types/badge.types";
import type { DisplayRule } from "../types/rules.types";
import {
  BADGE_TEMPLATES,
  DEFAULT_BADGE_STYLE,
  DEFAULT_DISPLAY_RULE_TYPE,
} from "../utils/constants";

type BadgeWithRules = Badge & { rules: DisplayRule[] };

// Postgres stores shape/animation/position/rule type as plain strings (no
// native enum support in this schema). This is the one place that trusts the
// DB and casts them back to the narrow union types — every caller downstream
// gets a fully typed domain object.
function toDomain(row: unknown): BadgeWithRules {
  return row as BadgeWithRules;
}

export async function listBadges(
  shop: string,
  opts?: { includeArchived?: boolean },
): Promise<BadgeWithRules[]> {
  const rows = await prisma.badge.findMany({
    where: { shop, ...(opts?.includeArchived ? {} : { isArchived: false }) },
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

  const updated = await prisma.badge.update({
    where: { id },
    data,
    include: { rules: true },
  });

  return toDomain(updated);
}

export async function setBadgeArchived(
  shop: string,
  id: string,
  isArchived: boolean,
): Promise<BadgeWithRules> {
  const existing = await prisma.badge.findFirst({ where: { shop, id } });
  if (!existing) {
    throw new Error("Badge not found");
  }

  const updated = await prisma.badge.update({
    where: { id },
    data: { isArchived },
    include: { rules: true },
  });

  return toDomain(updated);
}

// Clones a badge's style and rules into a new badge, suffixing the name so
// merchants can tell the copy apart at a glance before renaming it.
export async function duplicateBadge(shop: string, id: string): Promise<BadgeWithRules> {
  const existing = await prisma.badge.findFirst({
    where: { shop, id },
    include: { rules: true },
  });
  if (!existing) {
    throw new Error("Badge not found");
  }

  const { id: _id, createdAt, updatedAt, rules, name, isArchived, ...rest } = existing;

  const created = await prisma.badge.create({
    data: {
      ...rest,
      name: `${name} (Copy)`,
      isArchived: false,
      rules: {
        create: rules.map(({ type, value }) => ({ shop, type, value })),
      },
    },
    include: { rules: true },
  });

  return toDomain(created);
}

// "Create Badge" nav entry — starts a brand-new badge from scratch (not from
// a library template) and drops the merchant straight into the Customizer.
export async function createCustomBadge(shop: string) {
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

// Creates a new Badge from a Badge Library template.
export async function createBadgeFromTemplate(shop: string, templateKey: string) {
  const template = BADGE_TEMPLATES.find((candidate) => candidate.key === templateKey);
  if (!template) {
    throw new Error(`Unknown badge template: ${templateKey}`);
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
