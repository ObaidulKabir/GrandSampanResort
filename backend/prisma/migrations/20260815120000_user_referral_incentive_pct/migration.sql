-- Per-referrer / broker commission override (null = use global referral policy).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralIncentivePct" DOUBLE PRECISION;
