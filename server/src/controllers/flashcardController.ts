import { Request, Response } from "express";
import {
  flashcardSchema,
  flashcardUpdateSchema,
  pushSubscriptionSchema,
  reminderSchema,
  topicSchema,
  topicUpdateSchema,
  groupSchema,
  groupUpdateSchema,
} from "../utils/validators.js";
import * as service from "../services/flashcardService.js";

const fail = (res: Response, error: unknown) => {
  if (error instanceof service.FlashcardError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
};

const parse = <T>(res: Response, result: { success: true; data: T } | { success: false; error: { flatten: () => unknown } }) => {
  if (!result.success) {
    res.status(400).json({ message: result.error.flatten() });
    return null;
  }
  return result.data;
};

export const topics = async (req: Request, res: Response) => {
  try { res.json({ topics: await service.listTopics(req.userId!) }); } catch (error) { fail(res, error); }
};

export const createTopic = async (req: Request, res: Response) => {
  const data = parse(res, topicSchema.safeParse(req.body)); if (!data) return;
  try { res.status(201).json({ topic: await service.createTopic(req.userId!, data.name, data.description) }); } catch (error) { fail(res, error); }
};

export const updateTopic = async (req: Request, res: Response) => {
  const data = parse(res, topicUpdateSchema.safeParse(req.body)); if (!data) return;
  try { res.json({ topic: await service.updateTopic(String(req.params.id), req.userId!, data) }); } catch (error) { fail(res, error); }
};

export const deleteTopic = async (req: Request, res: Response) => {
  try { await service.deleteTopic(String(req.params.id), req.userId!); res.status(204).send(); } catch (error) { fail(res, error); }
};

export const createGroup = async (req: Request, res: Response) => {
  const data = parse(res, groupSchema.safeParse(req.body)); if (!data) return;
  try { res.status(201).json({ group: await service.createGroup(String(req.params.topicId), req.userId!, data.name, data.description) }); } catch (error) { fail(res, error); }
};

export const updateGroup = async (req: Request, res: Response) => {
  const data = parse(res, groupUpdateSchema.safeParse(req.body)); if (!data) return;
  try { res.json({ group: await service.updateGroup(String(req.params.id), req.userId!, data) }); } catch (error) { fail(res, error); }
};

export const deleteGroup = async (req: Request, res: Response) => {
  try { await service.deleteGroup(String(req.params.id), req.userId!); res.status(204).send(); } catch (error) { fail(res, error); }
};

export const createCard = async (req: Request, res: Response) => {
  const data = parse(res, flashcardSchema.safeParse(req.body)); if (!data) return;
  try { res.status(201).json({ card: await service.createCard(String(req.params.groupId), req.userId!, data.question, data.answer) }); } catch (error) { fail(res, error); }
};

export const updateCard = async (req: Request, res: Response) => {
  const data = parse(res, flashcardUpdateSchema.safeParse(req.body)); if (!data) return;
  try { res.json({ card: await service.updateCard(String(req.params.id), req.userId!, data) }); } catch (error) { fail(res, error); }
};

export const deleteCard = async (req: Request, res: Response) => {
  try { await service.deleteCard(String(req.params.id), req.userId!); res.status(204).send(); } catch (error) { fail(res, error); }
};

export const setReminder = async (req: Request, res: Response) => {
  const data = parse(res, reminderSchema.safeParse(req.body)); if (!data) return;
  try { res.json({ reminder: await service.upsertReminder(String(req.params.groupId), req.userId!, data.timeOfDay, data.timezone, data.enabled) }); } catch (error) { fail(res, error); }
};

export const deleteReminder = async (req: Request, res: Response) => {
  try { await service.deleteReminder(String(req.params.groupId), req.userId!); res.status(204).send(); } catch (error) { fail(res, error); }
};

export const publicKey = (_req: Request, res: Response) => {
  if (!process.env.VAPID_PUBLIC_KEY) { res.status(503).json({ message: "Push notifications are not configured" }); return; }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

export const subscribe = async (req: Request, res: Response) => {
  const data = parse(res, pushSubscriptionSchema.safeParse(req.body)); if (!data) return;
  try { await service.saveSubscription(req.userId!, data); res.status(201).json({ message: "Notifications enabled" }); } catch (error) { fail(res, error); }
};

export const unsubscribe = async (req: Request, res: Response) => {
  const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
  if (!endpoint) { res.status(400).json({ message: "Subscription endpoint is required" }); return; }
  try { await service.removeSubscription(req.userId!, endpoint); res.status(204).send(); } catch (error) { fail(res, error); }
};
