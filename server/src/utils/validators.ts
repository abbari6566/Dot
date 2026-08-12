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

export const topicSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable(),
});

export const topicUpdateSchema = topicSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const groupSchema = topicSchema;
export const groupUpdateSchema = topicUpdateSchema;

export const flashcardSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  answer: z.string().trim().min(1).max(5000),
});

export const flashcardUpdateSchema = flashcardSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const reminderSchema = z.object({
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm format"),
  timezone: z.string().min(1).max(100).refine((timezone) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone"),
  enabled: z.boolean().default(true),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});
