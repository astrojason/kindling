"use client";

import { GoalSetting } from "@/components/profile/GoalSetting";
import { useAuth } from "@/lib/auth-context";
import { getStats, getStreak } from "@/lib/firestore";
import { getStreakStatus } from "@/lib/streak";
import { todayStr } from "@/lib/date";
import { useLoad } from "@/lib/useLoad";
import { LoadState } from "@/components/share/PageFrame";
import { levelFor, xpIntoLevel, XP_PER_LEVEL } from "@/lib/xp";

/** The profile at the top of the Profile page: level and points, streaks, and the daily goal (beside them from `lg`). */
export function ProfileView({ uid }: { uid: string }) {
  const { user } = useAuth();
  const state = useLoad(`profile-${uid}`, async () => {
    const [stats, streak] = await Promise.all([getStats(uid), getStreak(uid)]);
    return { stats, streak };
  });

  return (
    <LoadState state={state} notFound="Could not load your profile.">
      {({ stats, streak }) => (
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 lg:border-b lg:border-border lg:px-12 lg:py-7">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <span className="flex size-16 items-center justify-center rounded-full bg-accent text-2xl font-extrabold text-accent-fg">{levelFor(stats.xp)}</span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-extrabold text-fg-strong">{user?.displayName ?? "Your profile"}</h1>
                <p className="text-sm text-fg-muted">Level {levelFor(stats.xp)} · {stats.xp} points</p>
                <svg role="progressbar" aria-label="Progress to next level" aria-valuenow={xpIntoLevel(stats.xp)} aria-valuemax={XP_PER_LEVEL} className="mt-2 h-2 w-full" viewBox="0 0 100 2" preserveAspectRatio="none">
                  <rect width="100" height="2" rx="1" className="fill-accent-soft" />
                  <rect width={(xpIntoLevel(stats.xp) / XP_PER_LEVEL) * 100} height="2" rx="1" className="fill-accent" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-sm bg-accent-soft p-3"><p className="text-2xl font-extrabold text-accent">{getStreakStatus(streak, todayStr()).count}</p><p className="text-xs font-bold text-fg-muted">Day streak</p></div>
              <div className="rounded-sm bg-accent-soft p-3"><p className="text-2xl font-extrabold text-accent">{streak.longest || 0}</p><p className="text-xs font-bold text-fg-muted">Personal best</p></div>
            </div>
          </div>
          <GoalSetting uid={uid} initial={stats.goalMinutes} />
        </div>
      )}
    </LoadState>
  );
}
