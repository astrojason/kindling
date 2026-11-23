export interface StudyTimer {
  /** Starts counting (does nothing if already counting). */
  start(): void;
  /** Stops counting, keeping what was counted. */
  pause(): void;
  /** The whole seconds counted since the last take, counting a running stretch up to now; the fraction stays for next time. */
  take(): number;
}

/**
 * Counts real attention time for the learning goal: only the stretches between start and pause, and each stretch
 * is capped at `maxSegmentSeconds`, so a page left open (or a phone left on a note) never counts as hours of study.
 */
export function createStudyTimer(now: () => number, maxSegmentSeconds: number): StudyTimer {
  let startedAt: number | null = null;
  let accruedMs = 0;
  const running = () => (startedAt === null ? 0 : Math.max(0, Math.min(now() - startedAt, maxSegmentSeconds * 1000)));

  return {
    start() {
      if (startedAt === null) startedAt = now();
    },
    pause() {
      if (startedAt === null) return;
      accruedMs += running();
      startedAt = null;
    },
    take() {
      const totalMs = accruedMs + running();
      const seconds = Math.floor(totalMs / 1000);
      accruedMs = totalMs - seconds * 1000;
      if (startedAt !== null) startedAt = now(); // the running stretch is spent: begin a new one
      return seconds;
    },
  };
}
