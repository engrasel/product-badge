-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "text" TEXT NOT NULL DEFAULT 'SALE',
    "backgroundColor" TEXT NOT NULL DEFAULT '#FF3B30',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "borderColor" TEXT NOT NULL DEFAULT '#FF3B30',
    "fontSize" INTEGER NOT NULL DEFAULT 12,
    "fontWeight" TEXT NOT NULL DEFAULT '600',
    "borderRadius" INTEGER NOT NULL DEFAULT 4,
    "shadow" BOOLEAN NOT NULL DEFAULT false,
    "opacity" INTEGER NOT NULL DEFAULT 100,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "paddingX" INTEGER NOT NULL DEFAULT 8,
    "paddingY" INTEGER NOT NULL DEFAULT 4,
    "width" INTEGER,
    "height" INTEGER,
    "shape" TEXT NOT NULL DEFAULT 'RIBBON',
    "animation" TEXT NOT NULL DEFAULT 'NONE',
    "position" TEXT NOT NULL DEFAULT 'TOP_RIGHT',
    "offsetX" INTEGER NOT NULL DEFAULT 0,
    "offsetY" INTEGER NOT NULL DEFAULT 0,
    "customCss" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DisplayRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DisplayRule_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DisplayLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");

-- CreateIndex
CREATE INDEX "Badge_shop_idx" ON "Badge"("shop");

-- CreateIndex
CREATE INDEX "DisplayRule_shop_idx" ON "DisplayRule"("shop");

-- CreateIndex
CREATE INDEX "DisplayRule_badgeId_idx" ON "DisplayRule"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayLocation_shop_key_key" ON "DisplayLocation"("shop", "key");
