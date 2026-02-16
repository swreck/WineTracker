-- CreateEnum
CREATE TYPE "WineSource" AS ENUM ('weimax', 'costco', 'other');

-- AlterTable
ALTER TABLE "vintages" ADD COLUMN "source" "WineSource",
ADD COLUMN "source_custom" TEXT;

-- Prepopulate source for existing vintages with seller notes
UPDATE "vintages" SET "source" = 'weimax' WHERE "seller_notes" IS NOT NULL;
