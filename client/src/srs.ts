import type { Flashcard, ReviewGrade } from "./types";

const DAY_MS = 86_400_000;
const MASTERY_DAYS = 21;

// Mirrors server/src/services/flashcardService.ts scheduleNext() — used only to preview
// the next interval on grade buttons before the real grade is submitted.
export function previewInterval(card: Pick<Flashcard, "intervalDays" | "easeFactor" | "reps">, grade: ReviewGrade): number {
  let { intervalDays, easeFactor, reps } = card;

  if (grade === "AGAIN") {
    return 10 / (24 * 60);
  }
  if (grade === "HARD") easeFactor = Math.max(1.3, easeFactor - 0.15);
  if (grade === "EASY") easeFactor = easeFactor + 0.15;
  reps += 1;
  if (reps === 1) intervalDays = grade === "EASY" ? 4 : 1;
  else if (reps === 2) intervalDays = grade === "EASY" ? 7 : grade === "HARD" ? 2 : 6;
  else intervalDays = intervalDays * easeFactor * (grade === "HARD" ? 0.8 : grade === "EASY" ? 1.3 : 1);
  return intervalDays;
}

export function formatInterval(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 24 * 60))} min`;
  if (days < 1) return `${Math.round(days * 24)} hr${Math.round(days * 24) === 1 ? "" : "s"}`;
  const rounded = Math.round(days);
  return `${rounded} day${rounded === 1 ? "" : "s"}`;
}

export function mastery(card: Pick<Flashcard, "intervalDays">): number {
  return Math.max(0, Math.min(100, Math.round((card.intervalDays / MASTERY_DAYS) * 100)));
}

export function averageMastery(cards: Pick<Flashcard, "intervalDays">[]): number {
  if (!cards.length) return 0;
  return Math.round(cards.reduce((sum, c) => sum + mastery(c), 0) / cards.length);
}

export function isDue(card: Pick<Flashcard, "dueAt">, now = Date.now()): boolean {
  return new Date(card.dueAt).getTime() <= now;
}

export function dueLabel(cards: Pick<Flashcard, "dueAt">[], now = Date.now()): string {
  if (!cards.length) return "EMPTY";
  const earliest = Math.min(...cards.map((c) => new Date(c.dueAt).getTime()));
  if (earliest <= now) return "DUE NOW";
  const diffMs = earliest - now;
  if (diffMs < 60 * 60 * 1000) return `IN ${Math.max(1, Math.round(diffMs / 60000))}M`;
  if (diffMs < DAY_MS) return `IN ${Math.round(diffMs / (60 * 60 * 1000))}H`;
  return `IN ${Math.round(diffMs / DAY_MS)}D`;
}
