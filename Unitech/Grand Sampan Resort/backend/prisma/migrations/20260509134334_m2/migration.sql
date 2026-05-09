-- CreateEnum
CREATE TYPE "AboutSection" AS ENUM ('ABOUT_PROJECT', 'ABOUT_COMPOUND', 'ABOUT_COMPANY');

-- CreateTable
CREATE TABLE "AboutCard" (
    "id" TEXT NOT NULL,
    "section" "AboutSection" NOT NULL,
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AboutCard_section_sortOrder_idx" ON "AboutCard"("section", "sortOrder");
