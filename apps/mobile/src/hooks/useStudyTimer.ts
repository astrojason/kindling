import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { todayStr } from "@random-knowledge/shared/date";
import { createStudyTimer } from "@random-knowledge/shared/study-timer";
import { addStats } from "../lib/firestore";

/**
 * A study timer for a screen, plus `flush` to add the seconds it has counted to today's learning time (the same
 * `seconds` that lessons and card reviews feed). A failure to record is shown in an alert, which outlives the screen.
 */
export function useStudyTimer(uid: string, maxSegmentSeconds: number) {
  const [timer] = useState(() => createStudyTimer(Date.now, maxSegmentSeconds));

  const flush = useCallback(async () => {
    const seconds = timer.take();
    if (seconds <= 0) return;
    try {
      await addStats(uid, todayStr(), { seconds });
    } catch (err) {
      console.error("Failed to record study time", err);
      Alert.alert("Study time not recorded", err instanceof Error ? err.message : String(err));
    }
  }, [timer, uid]);

  return { timer, flush };
}
