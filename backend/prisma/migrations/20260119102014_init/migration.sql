-- CreateTable
CREATE TABLE "Suite" (
    "id" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "view" TEXT NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "currency" TEXT,

    CONSTRAINT "Suite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharePlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysPerMonth" INTEGER NOT NULL,
    "lockIn" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT,
    "suiteId" TEXT,
    "planStatus" TEXT,
    "planType" TEXT,
    "timeFraction" DOUBLE PRECISION,

    CONSTRAINT "SharePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "planId" TEXT,
    "investorId" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "amountTotal" INTEGER,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentScheduleItem" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "gatewayRef" TEXT,

    CONSTRAINT "PaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "nid" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "permanentAddress" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "picUrl" TEXT NOT NULL,
    "nomineeName" TEXT NOT NULL,
    "nomineeNid" TEXT NOT NULL,
    "nomineePicUrl" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SharePlan" ADD CONSTRAINT "SharePlan_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "Suite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentScheduleItem" ADD CONSTRAINT "PaymentScheduleItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
