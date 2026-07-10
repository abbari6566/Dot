import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const startPomodoroSchema = z.object({
  duration: z.number().int().min(1).max(180).default(45),
  totalSessions: z.number().int().min(1).max(20).default(1),
});
