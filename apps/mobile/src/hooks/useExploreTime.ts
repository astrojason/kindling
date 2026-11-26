import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useStudyTimer } from "./useStudyTimer";

/** One stretch counts at most this long, so an article (or Explore) left open does not count as hours of study. */
const MAX_EXPLORE_SECONDS = 30 * 60;

/**
 * Counts time on Explore toward today's learning time: while the app is in the foreground, and also while an article
 * opened from it is being read in the browser (until the user comes back), each stretch capped. Returns
 * `articleOpened`, to call just before an article is opened.
 */
export function useExploreTime(uid: string) {
  const { timer, flush } = useStudyTimer(uid, MAX_EXPLORE_SECONDS);
  const reading = useRef(false);

  useEffect(() => {
    if (AppState.currentState === "active") timer.start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        reading.current = false;
        void flush();
        timer.start();
      } else {
        // Reading the article just opened is exploring too: keep counting until the user is back.
        if (!reading.current) timer.pause();
        void flush();
      }
    });
    return () => {
      subscription.remove();
      timer.pause();
      void flush();
    };
  }, [timer, flush]);

  return useCallback(() => {
    reading.current = true;
  }, []);
}
