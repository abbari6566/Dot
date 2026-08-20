import { Request, Response } from "express";
import {
  listCountdowns,
  createCountdown,
  updateCountdown,
  deleteCountdown,
  CountdownError,
} from "../services/countdownService.js";
import { countdownCreateSchema, countdownUpdateSchema } from "../utils/validators.js";

export const list = async (req: Request, res: Response) => {
  try {
    const countdowns = await listCountdowns(req.userId!);
    res.status(200).json({ countdowns });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const validated = countdownCreateSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ message: validated.error.flatten().fieldErrors });
      return;
    }
    const { title, targetDate, color } = validated.data;
    const countdown = await createCountdown(req.userId!, title, targetDate, color);
    res.status(201).json({ countdown });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const update = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const validated = countdownUpdateSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ message: validated.error.flatten().fieldErrors });
      return;
    }
    const countdown = await updateCountdown(id, req.userId!, validated.data);
    res.status(200).json({ countdown });
  } catch (error) {
    if (error instanceof CountdownError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const remove = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    await deleteCountdown(id, req.userId!);
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    if (error instanceof CountdownError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
