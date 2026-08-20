-- CreateEnum
CREATE TYPE "ReviewGrade" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Flashcard" ADD COLUMN "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Flashcard" ADD COLUMN "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5;
ALTER TABLE "Flashcard" ADD COLUMN "reps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Flashcard" ADD COLUMN "lastReviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FlashcardReview" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grade" "ReviewGrade" NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlashcardReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Flashcard_dueAt_idx" ON "Flashcard"("dueAt");
CREATE INDEX "FlashcardReview_cardId_idx" ON "FlashcardReview"("cardId");
CREATE INDEX "FlashcardReview_userId_reviewedAt_idx" ON "FlashcardReview"("userId", "reviewedAt");

ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
