export interface SM2Input {
  rating: number;
  intervalDays: number;
  easinessFactor: number;
  sessionCount: number;
}

export interface SM2Result {
  intervalDays: number;
  easinessFactor: number;
  sessionCount: number;
  nextReviewAt: Date;
}

/** SM-2 spaced repetition for notes, from a 1-5 self-rating; below 3 resets the interval to a day. */
export function computeSM2({ rating, intervalDays, easinessFactor, sessionCount }: SM2Input): SM2Result {
  let newInterval: number;
  let newEF: number;

  if (rating < 3) {
    newInterval = 1;
    newEF = Math.max(1.3, easinessFactor - 0.2);
  } else {
    if (sessionCount === 0) newInterval = 1;
    else if (sessionCount === 1) newInterval = 6;
    else newInterval = Math.round(intervalDays * easinessFactor);

    newEF = easinessFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    newEF = Math.max(1.3, newEF);
  }

  const nextReviewAt = new Date();
  nextReviewAt.setHours(0, 0, 0, 0);
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return { intervalDays: newInterval, easinessFactor: newEF, sessionCount: sessionCount + 1, nextReviewAt };
}
