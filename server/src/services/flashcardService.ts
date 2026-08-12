import prisma from "../utils/prisma.js";

export class FlashcardError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const duplicate = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

const ensureTopic = async (topicId: string, userId: string) => {
  const topic = await prisma.flashcardTopic.findFirst({ where: { id: topicId, userId } });
  if (!topic) throw new FlashcardError("Topic not found", 404);
  return topic;
};

const ensureGroup = async (groupId: string, userId: string) => {
  const group = await prisma.flashcardGroup.findFirst({ where: { id: groupId, userId } });
  if (!group) throw new FlashcardError("Group not found", 404);
  return group;
};

const topicInclude = {
  groups: {
    orderBy: { updatedAt: "desc" as const },
    include: {
      flashcards: { orderBy: { createdAt: "asc" as const } },
      reminder: true,
      _count: { select: { flashcards: true } },
    },
  },
  _count: { select: { groups: true } },
};

export const listTopics = (userId: string) => prisma.flashcardTopic.findMany({
  where: { userId }, orderBy: { updatedAt: "desc" }, include: topicInclude,
});

export const createTopic = async (userId: string, name: string, description?: string | null) => {
  try {
    return await prisma.flashcardTopic.create({
      data: { userId, name, description: description || null }, include: topicInclude,
    });
  } catch (error) {
    if (duplicate(error)) throw new FlashcardError("A topic with this name already exists", 409);
    throw error;
  }
};

export const updateTopic = async (topicId: string, userId: string, data: { name?: string; description?: string | null }) => {
  await ensureTopic(topicId, userId);
  try { return await prisma.flashcardTopic.update({ where: { id: topicId }, data }); }
  catch (error) { if (duplicate(error)) throw new FlashcardError("A topic with this name already exists", 409); throw error; }
};

export const deleteTopic = async (topicId: string, userId: string) => {
  await ensureTopic(topicId, userId); await prisma.flashcardTopic.delete({ where: { id: topicId } });
};

export const createGroup = async (topicId: string, userId: string, name: string, description?: string | null) => {
  await ensureTopic(topicId, userId);
  try {
    return await prisma.flashcardGroup.create({
      data: { topicId, userId, name, description: description || null },
      include: { flashcards: true, reminder: true, _count: { select: { flashcards: true } } },
    });
  } catch (error) {
    if (duplicate(error)) throw new FlashcardError("A group with this name already exists in this topic", 409);
    throw error;
  }
};

export const updateGroup = async (groupId: string, userId: string, data: { name?: string; description?: string | null }) => {
  await ensureGroup(groupId, userId);
  try { return await prisma.flashcardGroup.update({ where: { id: groupId }, data }); }
  catch (error) { if (duplicate(error)) throw new FlashcardError("A group with this name already exists in this topic", 409); throw error; }
};

export const deleteGroup = async (groupId: string, userId: string) => {
  await ensureGroup(groupId, userId); await prisma.flashcardGroup.delete({ where: { id: groupId } });
};

export const createCard = async (groupId: string, userId: string, question: string, answer: string) => {
  const group = await ensureGroup(groupId, userId);
  return prisma.flashcard.create({ data: { topicId: group.topicId, groupId, userId, question, answer } });
};

export const updateCard = async (cardId: string, userId: string, data: { question?: string; answer?: string }) => {
  const card = await prisma.flashcard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new FlashcardError("Flashcard not found", 404);
  return prisma.flashcard.update({ where: { id: cardId }, data });
};

export const deleteCard = async (cardId: string, userId: string) => {
  const card = await prisma.flashcard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new FlashcardError("Flashcard not found", 404);
  await prisma.flashcard.delete({ where: { id: cardId } });
};

// Searching UTC minutes handles IANA timezones and daylight-saving transitions safely.
export const nextOccurrence = (timeOfDay: string, timezone: string, after = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const cursor = new Date(after.getTime() + 60_000); cursor.setUTCSeconds(0, 0);
  for (let minute = 0; minute < 60 * 49; minute += 1) {
    if (formatter.format(cursor) === timeOfDay) return cursor;
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  throw new FlashcardError("Could not schedule reminder in this timezone", 400);
};

export const upsertReminder = async (groupId: string, userId: string, timeOfDay: string, timezone: string, enabled: boolean) => {
  await ensureGroup(groupId, userId);
  const nextNotificationAt = nextOccurrence(timeOfDay, timezone);
  return prisma.reviewReminder.upsert({
    where: { groupId },
    create: { groupId, userId, timeOfDay, timezone, enabled, nextNotificationAt },
    update: { timeOfDay, timezone, enabled, nextNotificationAt },
  });
};

export const deleteReminder = async (groupId: string, userId: string) => {
  await ensureGroup(groupId, userId); await prisma.reviewReminder.deleteMany({ where: { groupId, userId } });
};

export const saveSubscription = (userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
  prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });

export const removeSubscription = (userId: string, endpoint: string) =>
  prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
