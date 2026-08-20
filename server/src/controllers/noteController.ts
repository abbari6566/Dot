import { Request, Response } from "express";
import {
  folderSchema,
  folderUpdateSchema,
  noteCreateSchema,
  noteUpdateSchema,
  noteTaskSchema,
  noteTaskUpdateSchema,
} from "../utils/validators.js";
import * as service from "../services/noteService.js";

const fail = (res: Response, error: unknown) => {
  if (error instanceof service.NoteError) {
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

export const list = async (req: Request, res: Response) => {
  try { res.json({ folders: await service.listFolders(req.userId!) }); } catch (error) { fail(res, error); }
};

export const createFolder = async (req: Request, res: Response) => {
  const data = parse(res, folderSchema.safeParse(req.body)); if (!data) return;
  try { res.status(201).json({ folder: await service.createFolder(req.userId!, data.name) }); } catch (error) { fail(res, error); }
};

export const updateFolder = async (req: Request, res: Response) => {
  const data = parse(res, folderUpdateSchema.safeParse(req.body)); if (!data) return;
  try { res.json({ folder: await service.updateFolder(String(req.params.id), req.userId!, data.name ?? "") }); } catch (error) { fail(res, error); }
};

export const deleteFolder = async (req: Request, res: Response) => {
  try { await service.deleteFolder(String(req.params.id), req.userId!); res.status(204).send(); } catch (error) { fail(res, error); }
};

export const createNote = async (req: Request, res: Response) => {
  const data = parse(res, noteCreateSchema.safeParse(req.body)); if (!data) return;
  try { res.status(201).json({ note: await service.createNote(data.folderId, req.userId!, data.title) }); } catch (error) { fail(res, error); }
};

export const getNote = async (req: Request, res: Response) => {
  try { res.json({ note: await service.getNote(String(req.params.id), req.userId!) }); } catch (error) { fail(res, error); }
};

export const updateNote = async (req: Request, res: Response) => {
  const data = parse(res, noteUpdateSchema.safeParse(req.body)); if (!data) return;
  const remindAt = data.remindAt === undefined ? undefined : data.remindAt === null ? null : new Date(data.remindAt);
  try { res.json({ note: await service.updateNote(String(req.params.id), req.userId!, { title: data.title, content: data.content, remindAt }) }); } catch (error) { fail(res, error); }
};

export const deleteNote = async (req: Request, res: Response) => {
  try { await service.deleteNote(String(req.params.id), req.userId!); res.status(204).send(); } catch (error) { fail(res, error); }
};

export const createTask = async (req: Request, res: Response) => {
  const data = parse(res, noteTaskSchema.safeParse(req.body)); if (!data) return;
  try { res.status(201).json({ task: await service.createTask(String(req.params.id), req.userId!, data.text) }); } catch (error) { fail(res, error); }
};

export const toggleTask = async (req: Request, res: Response) => {
  const data = parse(res, noteTaskUpdateSchema.safeParse(req.body)); if (!data) return;
  try { res.json({ task: await service.toggleTask(String(req.params.id), req.userId!, data.done) }); } catch (error) { fail(res, error); }
};

export const deleteTask = async (req: Request, res: Response) => {
  try { await service.deleteTask(String(req.params.id), req.userId!); res.status(204).send(); } catch (error) { fail(res, error); }
};
