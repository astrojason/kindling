"use client";

import Link from "next/link";
import { GoalCard } from "@/components/today/GoalCard";
import { PlanCard } from "@/components/today/PlanCard";
import { ReviewRow } from "@/components/today/ReviewRow";
import { StatChips } from "@/components/today/StatChips";
import { LoadingView } from "@/components/lesson/LoadingView";
import { getStreakStatus } from "@/lib/streak";
import { dueCards } from "@/lib/srs";
import { useProgressData } from "@/lib/useProgressData";
import type { PlanItem } from "@/lib/lesson-plan";
import type { StreakData } from "@/lib/types";

const tileClass = "flex flex-col items-start gap-1 rounded-md bg-surface p-4 text-left text-sm font-extrabold text-fg-strong shadow-sm";

/** The Today tab: greeting, streak and points, daily goal, today's lesson, review and shortcuts. */
export function TodayHome({
  uid, date, plan, streak, categoryCount, onStart, onOpen, onRetry, onEditCategories,
}: {
  uid: string;
  date: string;
  plan: PlanItem[];
  streak: StreakData;
  categoryCount: number;
  onStart: () => void;
  onOpen: (key: string) => void;
  onRetry: () => void;
  onEditCategories: () => void;
}) {
  const progress = useProgressData(uid);
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg-muted">Ready for today&apos;s spark?</p>
          <h1 className="text-3xl font-extrabold leading-tight text-fg-strong">Kindling</h1>
        </div>
        <StatChips streakCount={getStreakStatus(streak, date).count} xp={progress.data?.stats.xp ?? 0} />
      </header>

      {progress.loading && <LoadingView text="Loading your progress" />}
      {progress.error && <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{progress.error}</pre>}
      {progress.data && <GoalCard stats={progress.data.stats} date={date} />}

      <PlanCard plan={plan} onStart={onStart} onOpen={onOpen} onRetry={onRetry} />

      {progress.data && <ReviewRow dueCount={dueCards(progress.data.cards, date).length} totalCount={progress.data.cards.length} />}

      <section aria-label="Keep exploring">
        <h2 className="mb-3 text-lg font-extrabold text-fg-strong">Keep exploring</h2>
        <div className="grid grid-cols-3 gap-3">
          <button type="button" onClick={onEditCategories} className={tileClass}>
            <span className="text-xs font-bold text-fg-muted">{categoryCount} selected</span>
            My categories ({categoryCount})
          </button>
          <Link href="/library" className={tileClass}>
            <span className="text-xs font-bold text-fg-muted">Past lessons</span>
            Library
          </Link>
          <Link href="/library" className={tileClass}>
            <span className="text-xs font-bold text-fg-muted">From friends</span>
            Shared
          </Link>
        </div>
      </section>
    </div>
  );
}
