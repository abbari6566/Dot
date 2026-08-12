import type { Flashcard, FlashcardGroup, FlashcardTopic, PomodoroCycle, ReviewReminder } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "/api";
let accessToken = sessionStorage.getItem("dot.accessToken");

const setToken = (token: string | null) => {
  accessToken = token;
  if (token) sessionStorage.setItem("dot.accessToken", token);
  else sessionStorage.removeItem("dot.accessToken");
};

const messageFrom = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return Object.values(value).flat().join(" ");
  return "Something went wrong.";
};

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });

  if (response.status === 401 && retry && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) {
      const data = await refreshed.json() as { accessToken: string };
      setToken(data.accessToken);
      return request<T>(path, options, false);
    }
    setToken(null);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFrom(data.message));
  return data as T;
}

export const api = {
  hasToken: () => Boolean(accessToken),
  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: { id: string; name: string; email: string } }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  async login(email: string, password: string) {
    const data = await request<{ accessToken: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setToken(data.accessToken);
  },
  async logout() {
    await request("/auth/logout", { method: "POST" }, false).catch(() => undefined);
    setToken(null);
  },
  active: () => request<{ cycle: PomodoroCycle | null }>("/pomodoro/active"),
  history: () => request<{ cycles: PomodoroCycle[] }>("/pomodoro/history"),
  start: (duration: number, totalSessions: number) => request<{ cycle: PomodoroCycle }>("/pomodoro/start", { method: "POST", body: JSON.stringify({ duration, totalSessions }) }),
  complete: (sessionId: string) => request<{ nextSession: PomodoroCycle["sessions"][number] | null }>(`/pomodoro/${sessionId}/complete`, { method: "PATCH" }),
  interrupt: (sessionId: string) => request(`/pomodoro/${sessionId}/interrupt`, { method: "PATCH" }),
  topics: () => request<{ topics: FlashcardTopic[] }>("/flashcards/topics"),
  createTopic: (body: { name: string; description?: string }) =>
    request<{ topic: FlashcardTopic }>("/flashcards/topics", { method: "POST", body: JSON.stringify(body) }),
  updateTopic: (id: string, body: { name?: string; description?: string | null }) =>
    request<{ topic: FlashcardTopic }>(`/flashcards/topics/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTopic: (id: string) => request(`/flashcards/topics/${id}`, { method: "DELETE" }),
  createGroup: (topicId: string, body: { name: string; description?: string }) =>
    request<{ group: FlashcardGroup }>(`/flashcards/topics/${topicId}/groups`, { method: "POST", body: JSON.stringify(body) }),
  updateGroup: (id: string, body: { name?: string; description?: string | null }) =>
    request<{ group: FlashcardGroup }>(`/flashcards/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteGroup: (id: string) => request(`/flashcards/groups/${id}`, { method: "DELETE" }),
  createCard: (groupId: string, body: { question: string; answer: string }) =>
    request<{ card: Flashcard }>(`/flashcards/groups/${groupId}/cards`, { method: "POST", body: JSON.stringify(body) }),
  updateCard: (id: string, body: { question?: string; answer?: string }) =>
    request<{ card: Flashcard }>(`/flashcards/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCard: (id: string) => request(`/flashcards/cards/${id}`, { method: "DELETE" }),
  setReminder: (groupId: string, body: { timeOfDay: string; timezone: string; enabled: boolean }) =>
    request<{ reminder: ReviewReminder }>(`/flashcards/groups/${groupId}/reminder`, { method: "PUT", body: JSON.stringify(body) }),
  deleteReminder: (groupId: string) => request(`/flashcards/groups/${groupId}/reminder`, { method: "DELETE" }),
  pushPublicKey: () => request<{ publicKey: string }>("/flashcards/notifications/public-key"),
  savePushSubscription: (subscription: PushSubscriptionJSON) =>
    request("/flashcards/notifications/subscriptions", { method: "POST", body: JSON.stringify(subscription) }),
};
