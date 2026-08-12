-- Investment share-plan purchases share a suiteId but are not date-based stays.
-- The original exclusion constraint blocked multiple plan sales (and cancelled
-- rows still occupied the range). Limit overlap protection to active guest stays.
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "booking_no_overlap_per_suite";

ALTER TABLE "Booking"
ADD CONSTRAINT "booking_no_overlap_per_suite"
EXCLUDE USING gist
(
  "suiteId" WITH =,
  tsrange("start", "end", '[]') WITH &&
)
WHERE ("planId" IS NULL AND status <> 'cancelled');
