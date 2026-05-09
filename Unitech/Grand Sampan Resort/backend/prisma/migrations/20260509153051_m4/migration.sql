/*
  Warnings:

  - Made the column `category` on table `FaqEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FaqEntry" ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'General';

-- CreateTable
CREATE TABLE "FaqCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaqCategory_name_key" ON "FaqCategory"("name");

-- CreateIndex
CREATE INDEX "FaqCategory_sortOrder_idx" ON "FaqCategory"("sortOrder");
