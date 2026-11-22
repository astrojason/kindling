"use client";

import { useState } from "react";
import { getReviewCards, getStats } from "@/lib/firestore";
import { useLoad } from "@/lib/useLoad";

/** Points, daily goal, learning time and review cards for a user, reloadable after they change. */
export function useProgressData(uid: string) {
  const [version, setVersion] = useState(0);
  const state = useLoad(`progress-data-${uid}-${version}`, async () => {
    const [stats, cards] = await Promise.all([getStats(uid), getReviewCards(uid)]);
    return { stats, cards };
  });
  return { ...state, reload: () => setVersion((v) => v + 1) };
}
