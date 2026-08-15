-- Snapshot of how an investment booking was priced (promo + advance-payment tier).
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "listPrice" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "promoDiscountPct" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "promoName" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "advanceDiscountPct" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentTierId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "installmentMonths" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cadence" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "discountRateAnnualPct" DOUBLE PRECISION;
