import type { Countdown, Flashcard, FlashcardGroup, FlashcardTopic, Note, NoteFolder, NoteTask, PomodoroCycle, ReviewGrade, ReviewReminder, ReviewStats, UserProfile } from "./types";

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
  me: () => request<{ user: UserProfile }>("/auth/me"),
  updateDailyGoal: (dailyGoal: number) => request<{ user: UserProfile }>("/auth/daily-goal", { method: "PATCH", body: JSON.stringify({ dailyGoal }) }),
  updateProfile: (body: { name?: string; email?: string }) => request<{ user: UserProfile }>("/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) => request<{ message: string }>("/auth/password", { method: "PATCH", body: JSON.stringify(body) }),
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
  reviewCard: (id: string, grade: ReviewGrade) => request<{ card: Flashcard }>(`/flashcards/cards/${id}/review`, { method: "POST", body: JSON.stringify({ grade }) }),
  reviewStats: () => request<ReviewStats>("/flashcards/review-stats"),
  pushPublicKey: () => request<{ publicKey: string }>("/flashcards/notifications/public-key"),
  savePushSubscription: (subscription: PushSubscriptionJSON) =>
    request("/flashcards/notifications/subscriptions", { method: "POST", body: JSON.stringify(subscription) }),
  notes: () => request<{ folders: NoteFolder[] }>("/notes"),
  createFolder: (name: string) => request<{ folder: NoteFolder }>("/notes/folders", { method: "POST", body: JSON.stringify({ name }) }),
  renameFolder: (id: string, name: string) => request<{ folder: NoteFolder }>(`/notes/folders/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteFolder: (id: string) => request(`/notes/folders/${id}`, { method: "DELETE" }),
  createNote: (folderId: string, title: string) => request<{ note: Note }>("/notes", { method: "POST", body: JSON.stringify({ folderId, title }) }),
  getNote: (id: string) => request<{ note: Note }>(`/notes/${id}`),
  updateNote: (id: string, body: { title?: string; content?: string; remindAt?: string | null }) =>
    request<{ note: Note }>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteNote: (id: string) => request(`/notes/${id}`, { method: "DELETE" }),
  createTask: (noteId: string, text: string) => request<{ task: NoteTask }>(`/notes/${noteId}/tasks`, { method: "POST", body: JSON.stringify({ text }) }),
  toggleTask: (id: string, done: boolean) => request<{ task: NoteTask }>(`/notes/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  deleteTask: (id: string) => request(`/notes/tasks/${id}`, { method: "DELETE" }),
  countdowns: () => request<{ countdowns: Countdown[] }>("/countdowns"),
  createCountdown: (body: { title: string; targetDate: string; color?: string }) =>
    request<{ countdown: Countdown }>("/countdowns", { method: "POST", body: JSON.stringify(body) }),
  updateCountdown: (id: string, body: { title?: string; targetDate?: string; color?: string | null }) =>
    request<{ countdown: Countdown }>(`/countdowns/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCountdown: (id: string) => request(`/countdowns/${id}`, { method: "DELETE" }),
};
