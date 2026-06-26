-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplayRule" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisplayRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplayLocation" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisplayLocation_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "DisplayRule" ADD CONSTRAINT "DisplayRule_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
