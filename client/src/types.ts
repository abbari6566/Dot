export type SessionStatus = "IN_PROGRESS" | "COMPLETED" | "INTERRUPTED";
export type CycleStatus = SessionStatus;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  dailyGoal: number;
  createdAt: string;
}

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

export type ReviewGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface Flashcard {
  id: string;
  topicId: string;
  groupId: string;
  question: string;
  answer: string;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  reps: number;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  retention30d: number;
  reviewStreak: number;
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

export interface NoteTask {
  id: string;
  noteId: string;
  text: string;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  remindAt: string | null;
  remindedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: NoteTask[];
  _count: { tasks: number };
}

export interface NoteFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
}

export interface Countdown {
  id: string;
  title: string;
  targetDate: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}
