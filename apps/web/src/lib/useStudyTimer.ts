"use client";

import { useCallback, useState } from "react";
import { createStudyTimer } from "@random-knowledge/shared/study-timer";
import { useToast } from "@/components/Toast";
import { nowMs } from "@/lib/clock";
import { todayStr } from "@/lib/date";
import { addStats } from "@/lib/firestore";

/**
 * A study timer for a screen, plus `flush` to add the seconds it has counted to today's learning time (the same
 * `seconds` that lessons and card reviews feed). A failure to record is shown in a toast, which outlives the page.
 */
export function useStudyTimer(uid: string, maxSegmentSeconds: number) {
  const toast = useToast();
  const [timer] = useState(() => createStudyTimer(nowMs, maxSegmentSeconds));

  const flush = useCallback(async () => {
    const seconds = timer.take();
    if (seconds <= 0) return;
    try {
      await addStats(uid, todayStr(), { seconds });
    } catch (err) {
      console.error("Failed to record study time", err);
      toast(`Your study time could not be recorded: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [timer, uid, toast]);

  return { timer, flush };
}
