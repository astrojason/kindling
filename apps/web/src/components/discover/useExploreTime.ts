"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStudyTimer } from "@/lib/useStudyTimer";

/** One stretch counts at most this long, so an article tab (or Explore) left open does not count as hours of study. */
const MAX_EXPLORE_SECONDS = 30 * 60;

/**
 * Counts time on Explore toward today's learning time: while the page is visible, and also while an article opened
 * from it is being read in another tab (until the user comes back), each stretch capped. Returns `articleOpened`,
 * to call when an article is opened.
 */
export function useExploreTime(uid: string) {
  const { timer, flush } = useStudyTimer(uid, MAX_EXPLORE_SECONDS);
  const reading = useRef(false);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        // Reading the article just opened is exploring too: keep counting until the user is back.
        if (!reading.current) timer.pause();
        void flush();
      } else {
        reading.current = false;
        void flush();
        timer.start();
      }
    }
    if (document.visibilityState !== "hidden") timer.start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      timer.pause();
      void flush();
    };
  }, [timer, flush]);

  return useCallback(() => {
    reading.current = true;
  }, []);
}
