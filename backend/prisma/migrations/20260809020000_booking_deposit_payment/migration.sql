-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "depositMethod" TEXT;
ALTER TABLE "Booking" ADD COLUMN "depositReference" TEXT;
ALTER TABLE "Booking" ADD COLUMN "depositProofUrl" TEXT;
ALTER TABLE "Booking" ADD COLUMN "depositNote" TEXT;
ALTER TABLE "Booking" ADD COLUMN "depositSubmittedAt" TIMESTAMP(3);
