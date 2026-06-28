-- AlterTable: drop billing/plan columns from ShopSettings, add shop-level prefs
ALTER TABLE "ShopSettings"
  DROP COLUMN "plan",
  DROP COLUMN "subscriptionStatus",
  DROP COLUMN "chargeId",
  DROP COLUMN "currentPeriodEnd";

ALTER TABLE "ShopSettings"
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "timezone" TEXT;

-- AlterTable: Badge archive flag + rule match mode
ALTER TABLE "Badge"
  ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "matchType" TEXT NOT NULL DEFAULT 'ALL';
