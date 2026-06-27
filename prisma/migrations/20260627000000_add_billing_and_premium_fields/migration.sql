-- AlterTable
ALTER TABLE "ShopSettings"
  ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'INACTIVE',
  ADD COLUMN "chargeId" TEXT,
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Badge"
  ADD COLUMN "backgroundType" TEXT NOT NULL DEFAULT 'SOLID',
  ADD COLUMN "gradientColor1" TEXT,
  ADD COLUMN "gradientColor2" TEXT,
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scheduleStart" TIMESTAMP(3),
  ADD COLUMN "scheduleEnd" TIMESTAMP(3),
  ADD COLUMN "timezone" TEXT,
  ADD COLUMN "displayLocations" TEXT,
  ADD COLUMN "customCssCode" TEXT;
