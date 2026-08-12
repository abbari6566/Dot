export type SessionStatus = "IN_PROGRESS" | "COMPLETED" | "INTERRUPTED";
export type CycleStatus = SessionStatus;

export interface PomodoroSession {
  id: string;
  cycleId: string;
  sessionNumber: number;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
}

export interface PomodoroCycle {
  id: string;
  duration: number;
  totalSessions: number;
  status: CycleStatus;
  createdAt: string;
  completedAt: string | null;
  sessions: PomodoroSession[];
}

export interface Flashcard {
  id: string;
  topicId: string;
  groupId: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewReminder {
  id: string;
  groupId: string;
  timeOfDay: string;
  timezone: string;
  enabled: boolean;
  nextNotificationAt: string;
  lastNotifiedAt: string | null;
}

export interface FlashcardTopic {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  groups: FlashcardGroup[];
  _count: { groups: number };
}

export interface FlashcardGroup {
  id: string;
  topicId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  flashcards: Flashcard[];
  reminder: ReviewReminder | null;
  _count: { flashcards: number };
}
