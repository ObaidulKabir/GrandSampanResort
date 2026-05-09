-- CreateTable
CREATE TABLE "FaqEntry" (
    "id" TEXT NOT NULL,
    "category" TEXT,
    "question" TEXT NOT NULL,
    "answerHtml" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaqEntry_category_sortOrder_idx" ON "FaqEntry"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "FaqEntry_question_idx" ON "FaqEntry"("question");
