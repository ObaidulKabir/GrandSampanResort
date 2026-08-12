-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "referredByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReferralReward" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "buyerId" TEXT,
    "saleAmount" INTEGER NOT NULL,
    "ratePct" DOUBLE PRECISION NOT NULL,
    "totalIncentive" INTEGER NOT NULL,
    "tranche1Amount" INTEGER NOT NULL,
    "tranche1Status" TEXT NOT NULL DEFAULT 'pending',
    "tranche1EarnedAt" TIMESTAMP(3),
    "tranche2Amount" INTEGER NOT NULL,
    "tranche2Status" TEXT NOT NULL DEFAULT 'pending',
    "tranche2EarnedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_bookingId_key" ON "ReferralReward"("bookingId");
CREATE INDEX IF NOT EXISTS "ReferralReward_referrerId_idx" ON "ReferralReward"("referrerId");
CREATE INDEX IF NOT EXISTS "ReferralReward_status_idx" ON "ReferralReward"("status");

DO $$ BEGIN
  ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
