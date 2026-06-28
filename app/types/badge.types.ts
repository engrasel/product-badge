// Domain types for a Badge. Postgres/Prisma stores the unions below as plain strings;
// these types are the single source of truth for what values are valid app-wide.

export type BadgeShape =
  | "RECTANGLE"
  | "ROUNDED"
  | "CIRCLE"
  | "RIBBON"
  | "PILL"
  | "TAG"
  | "CORNER"
  | "OUTLINE";

export type BadgeAnimation = "NONE" | "PULSE" | "BOUNCE" | "FADE" | "SHAKE";

// The 9-point grid shown in the Position picker, plus CUSTOM for manual
// pixel offsets ("Adjust position manually").
export type BadgePosition =
  | "TOP_LEFT"
  | "TOP_CENTER"
  | "TOP_RIGHT"
  | "MIDDLE_LEFT"
  | "CENTER"
  | "MIDDLE_RIGHT"
  | "BOTTOM_LEFT"
  | "BOTTOM_CENTER"
  | "BOTTOM_RIGHT"
  | "CUSTOM";

export type BadgeBackgroundType = "SOLID" | "GRADIENT";

// Mirrors the Prisma Badge model as a plain object for use outside the DB layer
// (components, services, the live preview, and the storefront renderer).
export interface Badge {
  id: string;
  shop: string;
  name: string;
  templateKey: string;
  isActive: boolean;
  isArchived: boolean;
  /** How this badge's DisplayRule rows combine: all must match, or any one match. */
  matchType: "ALL" | "ANY";

  text: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontSize: number;
  fontWeight: string;
  borderRadius: number;
  shadow: boolean;
  opacity: number;
  rotation: number;
  paddingX: number;
  paddingY: number;
  width: number | null;
  height: number | null;
  shape: BadgeShape;
  animation: BadgeAnimation;
  position: BadgePosition;
  offsetX: number;
  offsetY: number;
  customCss: string | null;

  // Design/display extensions.
  backgroundType: BadgeBackgroundType;
  gradientColor1: string | null;
  gradientColor2: string | null;
  priority: number;
  scheduleStart: Date | null;
  scheduleEnd: Date | null;
  timezone: string | null;
  /** JSON-encoded DisplayLocationKey[]; null means "all shop-enabled locations". */
  displayLocations: string | null;
  /** Raw CSS text injected as a scoped <style> tag on the storefront. */
  customCssCode: string | null;

  createdAt: Date;
  updatedAt: Date;
}

// The editable subset of Badge used by the customizer form and create/update services.
// isArchived/matchType are managed by their own actions (archive toggle, rule
// builder match mode), not by the style form.
export type BadgeStyleInput = Omit<
  Badge,
  "id" | "shop" | "createdAt" | "updatedAt" | "isArchived" | "matchType"
>;

// A library template merchants can start a badge from.
export interface BadgeTemplate {
  key: string;
  name: string;
  preview: Pick<
    BadgeStyleInput,
    | "text"
    | "backgroundColor"
    | "textColor"
    | "borderColor"
    | "shape"
    | "animation"
  >;
}
