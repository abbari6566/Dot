import prisma from "../utils/prisma.js";

export class NoteError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const ensureFolder = async (folderId: string, userId: string) => {
  const folder = await prisma.noteFolder.findFirst({ where: { id: folderId, userId } });
  if (!folder) throw new NoteError("Folder not found", 404);
  return folder;
};

const ensureNote = async (noteId: string, userId: string) => {
  const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!note) throw new NoteError("Note not found", 404);
  return note;
};

const ensureTask = async (taskId: string, userId: string) => {
  const task = await prisma.noteTask.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new NoteError("Task not found", 404);
  return task;
};

const noteInclude = {
  tasks: { orderBy: { createdAt: "asc" as const } },
  _count: { select: { tasks: true } },
};

const folderInclude = {
  notes: {
    orderBy: { updatedAt: "desc" as const },
    include: noteInclude,
  },
};

export const listFolders = (userId: string) => prisma.noteFolder.findMany({
  where: { userId },
  orderBy: { updatedAt: "desc" },
  include: folderInclude,
});

export const createFolder = (userId: string, name: string) =>
  prisma.noteFolder.create({ data: { userId, name } });

export const updateFolder = async (folderId: string, userId: string, name: string) => {
  await ensureFolder(folderId, userId);
  return prisma.noteFolder.update({ where: { id: folderId }, data: { name } });
};

export const deleteFolder = async (folderId: string, userId: string) => {
  await ensureFolder(folderId, userId);
  await prisma.noteFolder.delete({ where: { id: folderId } });
};

export const createNote = async (folderId: string, userId: string, title: string) => {
  await ensureFolder(folderId, userId);
  return prisma.note.create({ data: { folderId, userId, title }, include: noteInclude });
};

export const getNote = async (noteId: string, userId: string) => {
  const note = await ensureNote(noteId, userId);
  return prisma.note.findUnique({ where: { id: note.id }, include: noteInclude });
};

export const updateNote = async (
  noteId: string,
  userId: string,
  data: { title?: string; content?: string; remindAt?: Date | null },
) => {
  await ensureNote(noteId, userId);
  return prisma.note.update({ where: { id: noteId }, data, include: noteInclude });
};

export const deleteNote = async (noteId: string, userId: string) => {
  await ensureNote(noteId, userId);
  await prisma.note.delete({ where: { id: noteId } });
};

export const createTask = async (noteId: string, userId: string, text: string) => {
  await ensureNote(noteId, userId);
  return prisma.noteTask.create({ data: { noteId, userId, text } });
};

export const toggleTask = async (taskId: string, userId: string, done: boolean) => {
  await ensureTask(taskId, userId);
  return prisma.noteTask.update({
    where: { id: taskId },
    data: { done, completedAt: done ? new Date() : null },
  });
};

export const deleteTask = async (taskId: string, userId: string) => {
  await ensureTask(taskId, userId);
  await prisma.noteTask.delete({ where: { id: taskId } });
};
