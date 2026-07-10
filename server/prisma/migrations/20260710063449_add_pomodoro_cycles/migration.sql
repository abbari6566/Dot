/*
  Warnings:

  - You are about to drop the column `duration` on the `PomodoroSession` table. All the data in the column will be lost.
  - Added the required column `cycleId` to the `PomodoroSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionNumber` to the `PomodoroSession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'INTERRUPTED');

-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "PomodoroSession" DROP COLUMN "duration",
ADD COLUMN     "cycleId" TEXT NOT NULL,
ADD COLUMN     "sessionNumber" INTEGER NOT NULL,
ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- CreateTable
CREATE TABLE "PomodoroCycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PomodoroCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PomodoroCycle_userId_idx" ON "PomodoroCycle"("userId");

-- CreateIndex
CREATE INDEX "PomodoroSession_cycleId_idx" ON "PomodoroSession"("cycleId");

-- CreateIndex
CREATE INDEX "PomodoroSession_userId_idx" ON "PomodoroSession"("userId");

-- AddForeignKey
ALTER TABLE "PomodoroCycle" ADD CONSTRAINT "PomodoroCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PomodoroCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
