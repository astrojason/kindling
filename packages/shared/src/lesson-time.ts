import type { Lesson } from "./types";

const WORDS_PER_MINUTE = 150;
const SECONDS_PER_QUESTION = 30;

/** Reading time at narration pace plus 30 seconds per quiz question, in whole minutes (at least 1). */
export function estimateMinutes(lesson: Pick<Lesson, "body" | "quiz">): number {
  const words = lesson.body.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((words / WORDS_PER_MINUTE * 60 + lesson.quiz.length * SECONDS_PER_QUESTION) / 60));
}
