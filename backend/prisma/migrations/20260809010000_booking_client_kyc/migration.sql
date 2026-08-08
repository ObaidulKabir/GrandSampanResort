-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "clientId" TEXT;

-- AddForeignKey
ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
