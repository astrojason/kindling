import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { dueCards } from "@random-knowledge/shared/srs";
import { getReviewCards } from "../lib/firestore";

/**
 * Keeps the app icon badge equal to what's waiting: today's unfinished lesson, plus due notes and due review cards.
 * Notes and the lesson are live; cards are re-read from Firestore each time, so finishing a review on any tab
 * still leaves the right number when the app is closed. `dueNotes` is null until notes have loaded.
 */
export function useAppBadge(uid: string, date: string, dueNotes: number | null, lessonPending: boolean): void {
  const latest = useRef({ dueNotes, lessonPending });
  useEffect(() => {
    latest.current = { dueNotes, lessonPending };
  });

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      const { dueNotes: notes, lessonPending: lesson } = latest.current;
      if (notes === null) return;
      try {
        const cards = await getReviewCards(uid);
        if (!cancelled) await Notifications.setBadgeCountAsync(dueCards(cards, date).length + notes + (lesson ? 1 : 0));
      } catch (err) {
        console.error("Failed to update the app badge:", err);
      }
    }
    void sync();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void sync();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [uid, date, dueNotes, lessonPending]);
}
