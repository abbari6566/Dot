import { Request, Response } from "express";
import {
  startCycle,
  completeSession,
  interruptSession,
  getHistory,
  getActiveCycle,
} from "../services/pomodoroService.js";
import { startPomodoroSchema } from "../utils/validators.js";

export const start = async (req: Request, res: Response) => {
  try {
    const validated = startPomodoroSchema.safeParse(req.body);
    if (!validated.success) {
      res.status(400).json({ message: validated.error.flatten().fieldErrors });
      return;
    }
    const { duration, totalSessions } = validated.data;
    const cycle = await startCycle(req.userId!, duration, totalSessions);
    res.status(201).json({ cycle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const complete = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ message: "Invalid session id" });
    return;
  }
  try {
    const result = await completeSession(id, req.userId!);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Session not found") {
        res.status(404).json({ message: "Session not found" });
        return;
      }
      if (error.message === "Session already ended") {
        res.status(409).json({ message: "Session already ended" });
        return;
      }
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const interrupt = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ message: "Invalid session id" });
    return;
  }
  try {
    const result = await interruptSession(id, req.userId!);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Session not found") {
        res.status(404).json({ message: "Session not found" });
        return;
      }
      if (error.message === "Session already ended") {
        res.status(409).json({ message: "Session already ended" });
        return;
      }
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const history = async (req: Request, res: Response) => {
  try {
    const cycles = await getHistory(req.userId!);
    res.status(200).json({ cycles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const active = async (req: Request, res: Response) => {
  try {
    const cycle = await getActiveCycle(req.userId!);
    res.status(200).json({ cycle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
