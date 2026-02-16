-- Make tasting_date optional
ALTER TABLE "tasting_events" ALTER COLUMN "tasting_date" DROP NOT NULL;
