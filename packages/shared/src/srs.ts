import type { Lesson, ReviewCard, ReviewRating } from "./types";

/** Days until a card is due again, by Leitner box 0-6. */
export const BOX_DAYS = [0, 1, 3, 7, 14, 30, 60] as const;
const LAST_BOX = BOX_DAYS.length - 1;
const BOX_STEP: Record<ReviewRating, number | "reset"> = { again: "reset", hard: 0, good: 1, easy: 2 };

/** Calendar-date arithmetic on a YYYY-MM-DD string (UTC math on an already-local date). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** One card per quiz question, starting in box 1 so it is due the day after the lesson. */
export function newReviewCards(lesson: Lesson, lessonDate: string): ReviewCard[] {
  return lesson.quiz.map((q, i) => ({
    id: `${lessonDate}-${i}`,
    lessonDate,
    lessonTitle: lesson.title,
    category: lesson.category,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    box: 1,
    due: addDays(lessonDate, BOX_DAYS[1]),
  }));
}

export function rateCard(card: ReviewCard, rating: ReviewRating, today: string): ReviewCard {
  const step = BOX_STEP[rating];
  const box = step === "reset" ? 0 : Math.min(card.box + step, LAST_BOX);
  return { ...card, box, due: addDays(today, BOX_DAYS[box]) };
}

export function dueCards(cards: ReviewCard[], today: string): ReviewCard[] {
  return cards.filter((card) => card.due <= today).sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
}
