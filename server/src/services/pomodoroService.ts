import prisma from "../utils/prisma.js";
import { SessionStatus, CycleStatus } from "@prisma/client";

export const startCycle = async (
  userId: string,
  duration: number,
  totalSessions: number,
) => {
  const cycle = await prisma.pomodoroCycle.create({
    data: {
      userId,
      duration,
      totalSessions,
      sessions: {
        create: {
          userId,
          sessionNumber: 1,
        },
      },
    },
    include: { sessions: true },
  });

  return cycle;
};

export const completeSession = async (sessionId: string, userId: string) => {
  return prisma.$transaction(async (tx) => {
    const session = await tx.pomodoroSession.findFirst({
      where: { id: sessionId, userId },
      include: { cycle: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new Error("Session already ended");
    }

    const completedSession = await tx.pomodoroSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.COMPLETED, completedAt: new Date() },
    });

    const isLastSession = session.sessionNumber >= session.cycle.totalSessions;

    if (isLastSession) {
      const cycle = await tx.pomodoroCycle.update({
        where: { id: session.cycleId },
        data: { status: CycleStatus.COMPLETED, completedAt: new Date() },
      });
      return { session: completedSession, cycle, nextSession: null };
    }

    const nextSession = await tx.pomodoroSession.create({
      data: {
        cycleId: session.cycleId,
        userId,
        sessionNumber: session.sessionNumber + 1,
      },
    });

    return { session: completedSession, cycle: null, nextSession };
  });
};

export const interruptSession = async (sessionId: string, userId: string) => {
  return prisma.$transaction(async (tx) => {
    const session = await tx.pomodoroSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new Error("Session not found");
    }
    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new Error("Session already ended");
    }

    const interruptedSession = await tx.pomodoroSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.INTERRUPTED, completedAt: new Date() },
    });

    const cycle = await tx.pomodoroCycle.update({
      where: { id: session.cycleId },
      data: { status: CycleStatus.INTERRUPTED, completedAt: new Date() },
    });

    return { session: interruptedSession, cycle };
  });
};

export const getHistory = async (userId: string) => {
  return prisma.pomodoroCycle.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { sessionNumber: "asc" } },
    },
  });
};

export const getActiveCycle = async (userId: string) => {
  return prisma.pomodoroCycle.findFirst({
    where: { userId, status: CycleStatus.IN_PROGRESS },
    include: {
      sessions: { orderBy: { sessionNumber: "asc" } },
    },
  });
};
