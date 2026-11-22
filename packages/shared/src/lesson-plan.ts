/** Most lessons prepared for one day, however large the daily goal. */
export const MAX_PLAN_LESSONS = 5;

/** Storage key of a day's lesson: the first is keyed by the date alone (as it always was), later ones as `date~slot`. */
export function slotKey(date: string, slot: number): string {
  return slot <= 1 ? date : `${date}~${slot}`;
}

export function baseDate(key: string): string {
  return key.slice(0, 10);
}

export function slotOf(key: string): number {
  const suffix = key.slice(11);
  return suffix ? Number(suffix) || 1 : 1;
}

/** How many lessons cover the daily goal: the goal divided by a lesson's length, rounded up, between 1 and the cap. */
export function lessonsNeeded(goalMinutes: number, minutesPerLesson: number): number {
  if (minutesPerLesson <= 0) return MAX_PLAN_LESSONS;
  return Math.min(Math.max(Math.ceil(goalMinutes / minutesPerLesson), 1), MAX_PLAN_LESSONS);
}

/** One lesson in today's plan, as shown on the Today screen. */
export interface PlanItem {
  slot: number;
  key: string;
  status: "ready" | "queued" | "generating" | "error";
  done: boolean;
  title?: string;
  category?: import("./categories").CategoryKey;
  minutes?: number;
  error?: string;
}
