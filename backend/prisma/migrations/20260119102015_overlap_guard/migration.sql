-- Ensure required extension for exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping bookings per suite
ALTER TABLE "Booking"
ADD CONSTRAINT "booking_no_overlap_per_suite"
EXCLUDE USING gist
(
  "suiteId" WITH =,
  tsrange("start","end",'[]') WITH &&
);
