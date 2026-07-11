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
