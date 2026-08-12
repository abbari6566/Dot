-- DropForeignKey
ALTER TABLE "PomodoroCycle" DROP CONSTRAINT "PomodoroCycle_userId_fkey";

-- DropForeignKey
ALTER TABLE "PomodoroSession" DROP CONSTRAINT "PomodoroSession_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "PomodoroSession" DROP CONSTRAINT "PomodoroSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "FocusLock" DROP CONSTRAINT "FocusLock_userId_fkey";

-- AddForeignKey
ALTER TABLE "PomodoroCycle" ADD CONSTRAINT "PomodoroCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PomodoroCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusLock" ADD CONSTRAINT "FocusLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
