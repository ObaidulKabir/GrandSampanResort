-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "Booking" ADD COLUMN "cancelledAt" TIMESTAMP(3);
