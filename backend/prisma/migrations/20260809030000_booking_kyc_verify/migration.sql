-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "depositConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "kycVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "kycVerifiedAt" TIMESTAMP(3);
