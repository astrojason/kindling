import type { ReviewRating, StatsData } from "./types";
import { addDays } from "./srs";

export const XP_PER_LEVEL = 200;
export const GOAL_CHOICES = [5, 10, 15, 20] as const;
export const DEFAULT_GOAL_MINUTES = 15;
export const DEFAULT_STATS: StatsData = { xp: 0, goalMinutes: DEFAULT_GOAL_MINUTES, seconds: {} };

const QUIZ_CORRECT_XP = 10;
const LESSON_COMPLETE_XP = 15;
const GAME_BASE_XP = 20;
const GAME_SPEED_BONUS = 10;
const REVIEW_XP: Record<ReviewRating, number> = { again: 1, hard: 3, good: 5, easy: 5 };

export function lessonXp(correct: number): number {
  return correct * QUIZ_CORRECT_XP + LESSON_COMPLETE_XP;
}

/** 20 points for finishing plus a speed bonus of 10 minus 2 per miss, never below 0. */
export function gameXp(misses: number): number {
  return GAME_BASE_XP + Math.max(0, GAME_SPEED_BONUS - 2 * misses);
}

export function reviewXp(rating: ReviewRating): number {
  return REVIEW_XP[rating];
}

export function levelFor(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpIntoLevel(xp: number): number {
  return xp % XP_PER_LEVEL;
}

/** The seven dates of the Monday-first week containing `date`. */
export function weekDays(date: string): string[] {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const monday = addDays(date, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function minutesOn(stats: StatsData, date: string): number {
  return Math.floor((stats.seconds[date] ?? 0) / 60);
}

/** Share of the daily goal reached on `date`, from 0 to 1 (counts partial minutes). */
export function goalFraction(stats: StatsData, date: string): number {
  const goalSeconds = Math.max(stats.goalMinutes, 1) * 60;
  return Math.min((stats.seconds[date] ?? 0) / goalSeconds, 1);
}
