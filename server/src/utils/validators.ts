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

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
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

export const reviewGradeSchema = z.object({
  grade: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export const folderSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const folderUpdateSchema = folderSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required",
);

export const noteCreateSchema = z.object({
  folderId: z.string().min(1),
  title: z.string().trim().max(300).default("Untitled"),
});

export const noteUpdateSchema = z
  .object({
    title: z.string().trim().max(300).optional(),
    content: z.string().max(500_000).optional(),
    remindAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid reminder date").nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const noteTaskSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export const noteTaskUpdateSchema = z.object({
  done: z.boolean(),
});

export const dailyGoalSchema = z.object({
  dailyGoal: z.number().int().min(1).max(20),
});

export const countdownCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  color: z.string().trim().max(20).optional().nullable(),
});

export const countdownUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  targetDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional(),
  color: z.string().trim().max(20).optional().nullable(),
}).refine((v) => Object.keys(v).length > 0, "At least one field is required");
