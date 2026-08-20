import webpush from "web-push";
import prisma from "../utils/prisma.js";
import { nextOccurrence } from "./flashcardService.js";

let remindersRunning = false;
let notesRunning = false;
let timer: NodeJS.Timeout | undefined;

const configured = () => Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
);

type PushUser = {
  pushSubscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[];
};

const sendPushToUser = async (user: PushUser, payload: string) => {
  await Promise.all(user.pushSubscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload);
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? error.statusCode : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } });
      } else {
        console.error("Push delivery failed", error);
      }
    }
  }));
};

export const dispatchDueReminders = async () => {
  if (!configured() || remindersRunning) return;
  remindersRunning = true;
  try {
    const reminders = await prisma.reviewReminder.findMany({
      where: { enabled: true, nextNotificationAt: { lte: new Date() } },
      include: {
        group: { include: { topic: true, _count: { select: { flashcards: true } } } },
        user: { include: { pushSubscriptions: true } },
      },
      take: 100,
    });

    for (const reminder of reminders) {
      const payload = JSON.stringify({
        title: `Time to review ${reminder.group.name}`,
        body: `${reminder.group._count.flashcards} card${reminder.group._count.flashcards === 1 ? "" : "s"} in ${reminder.group.topic.name}.`,
        url: `/?view=flashcards&topic=${reminder.group.topicId}&group=${reminder.groupId}`,
      });

      await sendPushToUser(reminder.user, payload);

      const now = new Date();
      await prisma.reviewReminder.update({
        where: { id: reminder.id },
        data: {
          lastNotifiedAt: now,
          nextNotificationAt: nextOccurrence(reminder.timeOfDay, reminder.timezone, now),
        },
      });
    }
  } finally {
    remindersRunning = false;
  }
};

export const dispatchDueNoteReminders = async () => {
  if (!configured() || notesRunning) return;
  notesRunning = true;
  try {
    const notes = await prisma.note.findMany({
      where: { remindAt: { lte: new Date() }, remindedAt: null },
      include: { user: { include: { pushSubscriptions: true } } },
      take: 50,
    });

    for (const note of notes) {
      const payload = JSON.stringify({
        title: `Note reminder: ${note.title}`,
        body: "You asked to be reminded of this note.",
        url: `/?view=notes&note=${note.id}`,
      });

      await sendPushToUser(note.user, payload);
      await prisma.note.update({ where: { id: note.id }, data: { remindedAt: new Date() } });
    }
  } finally {
    notesRunning = false;
  }
};

const tick = () => {
  void dispatchDueReminders();
  void dispatchDueNoteReminders();
};

export const startNotificationScheduler = () => {
  if (!configured()) {
    console.warn("Web Push is disabled: VAPID environment variables are missing");
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  tick();
  timer = setInterval(tick, 60_000);
};

export const stopNotificationScheduler = () => {
  if (timer) clearInterval(timer);
};
