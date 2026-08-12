import webpush from "web-push";
import prisma from "../utils/prisma.js";
import { nextOccurrence } from "./flashcardService.js";

let running = false;
let timer: NodeJS.Timeout | undefined;

const configured = () => Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
);

export const dispatchDueReminders = async () => {
  if (!configured() || running) return;
  running = true;
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

      await Promise.all(reminder.user.pushSubscriptions.map(async (subscription) => {
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
    running = false;
  }
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
  void dispatchDueReminders();
  timer = setInterval(() => void dispatchDueReminders(), 60_000);
};

export const stopNotificationScheduler = () => {
  if (timer) clearInterval(timer);
};
