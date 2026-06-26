// Domain types for a Badge. SQLite/Prisma stores the unions below as plain strings;
// these types are the single source of truth for what values are valid app-wide.

export type BadgeShape = "RECTANGLE" | "ROUNDED" | "CIRCLE" | "RIBBON";

export type BadgeAnimation = "NONE" | "PULSE" | "BOUNCE" | "FADE" | "SHAKE";

export type BadgePosition =
  | "TOP_LEFT"
  | "TOP_RIGHT"
  | "BOTTOM_LEFT"
  | "BOTTOM_RIGHT"
  | "CENTER"
  | "CUSTOM";

// Mirrors the Prisma Badge model as a plain object for use outside the DB layer
// (components, services, the live preview, and the storefront renderer).
export interface Badge {
  id: string;
  shop: string;
  name: string;
  templateKey: string;
  isActive: boolean;

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

  createdAt: Date;
  updatedAt: Date;
}

// The editable subset of Badge used by the customizer form and create/update services.
export type BadgeStyleInput = Omit<
  Badge,
  "id" | "shop" | "createdAt" | "updatedAt"
>;

// A library template (free or premium) merchants can start a badge from.
export interface BadgeTemplate {
  key: string;
  name: string;
  isPro: boolean;
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
