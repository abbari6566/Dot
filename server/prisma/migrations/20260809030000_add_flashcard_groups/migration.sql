-- Add groups between topics and cards. Existing topic cards are preserved in a Main deck.
CREATE TABLE "FlashcardGroup" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlashcardGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FlashcardGroup_topicId_idx" ON "FlashcardGroup"("topicId");
CREATE INDEX "FlashcardGroup_userId_idx" ON "FlashcardGroup"("userId");
CREATE UNIQUE INDEX "FlashcardGroup_topicId_name_key" ON "FlashcardGroup"("topicId", "name");
ALTER TABLE "FlashcardGroup" ADD CONSTRAINT "FlashcardGroup_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "FlashcardTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardGroup" ADD CONSTRAINT "FlashcardGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FlashcardGroup" ("id", "topicId", "userId", "name", "description", "createdAt", "updatedAt")
SELECT "id" || '-main', "id", "userId", 'Main deck', 'Cards created before groups were added', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "FlashcardTopic";

ALTER TABLE "Flashcard" ADD COLUMN "groupId" TEXT;
UPDATE "Flashcard" SET "groupId" = "topicId" || '-main';
ALTER TABLE "Flashcard" ALTER COLUMN "groupId" SET NOT NULL;
CREATE INDEX "Flashcard_groupId_idx" ON "Flashcard"("groupId");
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FlashcardGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewReminder" ADD COLUMN "groupId" TEXT;
UPDATE "ReviewReminder" SET "groupId" = "topicId" || '-main';
ALTER TABLE "ReviewReminder" ALTER COLUMN "groupId" SET NOT NULL;
ALTER TABLE "ReviewReminder" DROP CONSTRAINT "ReviewReminder_topicId_fkey";
DROP INDEX "ReviewReminder_topicId_key";
ALTER TABLE "ReviewReminder" DROP COLUMN "topicId";
CREATE UNIQUE INDEX "ReviewReminder_groupId_key" ON "ReviewReminder"("groupId");
ALTER TABLE "ReviewReminder" ADD CONSTRAINT "ReviewReminder_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FlashcardGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
