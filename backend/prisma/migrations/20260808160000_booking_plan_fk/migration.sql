-- Drop orphan plan references so the FK can be added safely.
UPDATE "Booking"
SET "planId" = NULL
WHERE "planId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "SharePlan" AS sp WHERE sp."id" = "Booking"."planId"
  );

-- AddForeignKey: each investment booking belongs to a specific SharePlan.
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "SharePlan"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
