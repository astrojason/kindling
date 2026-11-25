"use client";

import Link from "next/link";
import { GoalSetting } from "@/components/profile/GoalSetting";
import { useAuth } from "@/lib/auth-context";
import { usePendingRequests } from "@/lib/usePendingRequests";
import { canManageAccess } from "@/lib/auth-guard";
import { getStats, getStreak } from "@/lib/firestore";
import { getStreakStatus } from "@/lib/streak";
import { todayStr } from "@/lib/date";
import { useLoad } from "@/lib/useLoad";
import { LoadState, PANEL } from "@/components/share/PageFrame";
import { levelFor, xpIntoLevel, XP_PER_LEVEL } from "@/lib/xp";

const linkClass = "flex items-center justify-between rounded-sm bg-surface-raised px-4 py-3.5 text-sm font-bold text-fg-strong hover:bg-accent-soft";

export function ProfileView({ uid }: { uid: string }) {
  const { user, claims } = useAuth();
  const { count: waiting } = usePendingRequests(user?.uid, claims);
  const state = useLoad(`profile-${uid}`, async () => {
    const [stats, streak] = await Promise.all([getStats(uid), getStreak(uid)]);
    return { stats, streak };
  });

  return (
    <LoadState state={state} notFound="Could not load your profile.">
      {({ stats, streak }) => (
        <div className="flex flex-col gap-6 lg:grid lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch lg:gap-0">
          <div className={`flex flex-col gap-6 ${PANEL}`}>
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
          <GoalSetting uid={uid} initial={stats.goalMinutes} />
          </div>
          <div className={`flex flex-col gap-6 ${PANEL}`}>
          <nav className="flex flex-col gap-2">
            <Link href="/settings" className={linkClass}>Settings</Link>
            {canManageAccess(claims) && (
              <Link href="/admin" className={linkClass}>
                Admin{waiting ? <span aria-label={`${waiting} waiting for access`} className="ml-2 rounded-full bg-rust px-2 py-0.5 text-[11px] font-extrabold text-accent-fg">{waiting}</span> : null}
              </Link>
            )}
          </nav>
          </div>
        </div>
      )}
    </LoadState>
  );
}
