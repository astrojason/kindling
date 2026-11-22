import { useCallback, useEffect, useState } from "react";
import type { ReviewCard, StatsData } from "@random-knowledge/shared/types";
import { getReviewCards, getStats } from "../lib/firestore";

interface ProgressData {
  stats: StatsData;
  cards: ReviewCard[];
}

/** Points, daily goal, learning time and review cards for a user; `reload` or a new `refreshKey` refetches after they change. */
export function useProgressData(uid: string, refreshKey = 0) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStats(uid), getReviewCards(uid)])
      .then(([stats, cards]) => {
        if (!cancelled) {
          setData({ stats, cards });
          setError(null);
        }
      })
      .catch((err) => {
        console.error("useProgressData failed:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your progress.");
      });
    return () => {
      cancelled = true;
    };
  }, [uid, version, refreshKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading: !data && !error, reload };
}
