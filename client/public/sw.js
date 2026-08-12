self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Flashcard review", {
    body: data.body || "Your cards are ready to review.",
    icon: "/dot.svg",
    badge: "/dot.svg",
    data: { url: data.url || "/?view=flashcards" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
