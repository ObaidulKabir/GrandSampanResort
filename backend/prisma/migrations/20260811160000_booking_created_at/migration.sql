-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill from deposit submission time when available
UPDATE "Booking"
SET "createdAt" = "depositSubmittedAt"
WHERE "depositSubmittedAt" IS NOT NULL;
