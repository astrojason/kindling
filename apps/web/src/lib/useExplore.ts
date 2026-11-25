"use client";

import type { User } from "firebase/auth";
import { requestJson } from "@/lib/api-client";
import type { SharedLessonSummary } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

export interface ExploreData {
  hasArticles: boolean;
  shared: SharedLessonSummary[];
}

// The tab bar is on every screen, so one answer is kept per account instead of asking again on each navigation.
const cache = new Map<string, Promise<ExploreData>>();

/** Forget the cached answer (after the articles account changes), so the tab bar and Explore ask again. */
export function forgetExplore(uid: string): void {
  cache.delete(uid);
}

function loadExplore(user: User): Promise<ExploreData> {
  let pending = cache.get(user.uid);
  if (!pending) {
    pending = user.getIdToken().then((token) => requestJson("/api/explore", token) as Promise<ExploreData>);
    // A failure is shown, then asked again next time rather than remembered.
    pending.catch(() => forgetExplore(user.uid));
    cache.set(user.uid, pending);
  }
  return pending;
}

/** Whether this user has their own articles feed, and the lessons other people shared: what Explore shows. */
export function useExplore(user: User | null) {
  return useLoad(`explore-${user?.uid ?? "signed-out"}`, () => (user ? loadExplore(user) : Promise.resolve({ hasArticles: false, shared: [] })));
}

/** Explore is offered only when it has something to show; a failed check keeps it, so the page can show the error. */
export function exploreAvailable(state: { data: ExploreData | null; error: string | null }): boolean {
  if (state.error) return true;
  return Boolean(state.data && (state.data.hasArticles || state.data.shared.length > 0));
}
