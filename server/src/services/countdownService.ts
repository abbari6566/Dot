import prisma from "../utils/prisma.js";

export class CountdownError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const ensureOwnership = async (id: string, userId: string) => {
  const item = await prisma.countdown.findFirst({ where: { id, userId } });
  if (!item) throw new CountdownError("Countdown not found", 404);
  return item;
};

export const listCountdowns = async (userId: string) => {
  return prisma.countdown.findMany({
    where: { userId },
    orderBy: { targetDate: "asc" },
  });
};

export const createCountdown = async (
  userId: string,
  title: string,
  targetDate: string,
  color?: string | null,
) => {
  return prisma.countdown.create({
    data: {
      userId,
      title,
      targetDate: new Date(targetDate),
      color: color ?? null,
    },
  });
};

export const updateCountdown = async (
  id: string,
  userId: string,
  data: { title?: string; targetDate?: string; color?: string | null },
) => {
  await ensureOwnership(id, userId);
  return prisma.countdown.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.targetDate !== undefined && { targetDate: new Date(data.targetDate) }),
      ...(data.color !== undefined && { color: data.color }),
    },
  });
};

export const deleteCountdown = async (id: string, userId: string) => {
  await ensureOwnership(id, userId);
  await prisma.countdown.delete({ where: { id } });
};
