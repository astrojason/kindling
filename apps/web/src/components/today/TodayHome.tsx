"use client";

import Link from "next/link";
import { PendingBanner } from "@/components/admin/PendingBanner";
import { DueNotes } from "@/components/review/DueNotes";
import { GoalCard } from "@/components/today/GoalCard";
import { PlanCard } from "@/components/today/PlanCard";
import { ReviewRow } from "@/components/today/ReviewRow";
import { StatChips } from "@/components/today/StatChips";
import { LoadingView } from "@/components/lesson/LoadingView";
import { dueNotes, upcomingNotes } from "@random-knowledge/shared/notes-view";
import { reviewSummary } from "@random-knowledge/shared/review-summary";
import { DesktopToday } from "@/components/today/DesktopToday";
import { getStreakStatus } from "@/lib/streak";
import { dueCards } from "@/lib/srs";
import { useNotes } from "@/lib/useNotes";
import { useProgressData } from "@/lib/useProgressData";
import type { PlanItem } from "@/lib/lesson-plan";
import type { StreakData } from "@/lib/types";
import { SignOutButton } from "@/components/nav/SignOutButton";

const tileClass = "flex flex-col items-start gap-1 rounded-md bg-surface p-4 text-left text-sm font-extrabold text-fg-strong shadow-sm";

/** The Today tab: greeting, streak and points, daily goal, today's lesson, review and shortcuts. */
export function TodayHome({
  uid, date, plan, streak, onStart, onOpen, onRetry,
}: {
  uid: string;
  date: string;
  plan: PlanItem[];
  streak: StreakData;
  onStart: () => void;
  onOpen: (key: string) => void;
  onRetry: () => void;
}) {
  const progress = useProgressData(uid);
  const { notes, error: notesError } = useNotes(uid);
  const now = new Date();
  const reviewReady = !!progress.data && !!(notes || notesError);
  const review = progress.data ? reviewSummary({ dueCards: dueCards(progress.data.cards, date).length, totalCards: progress.data.cards.length, dueNotes: notes ? dueNotes(notes).length : 0, totalNotes: notes?.length ?? 0 }) : null;
  return (
    <>
    <DesktopToday
      date={date} plan={plan} streakCount={getStreakStatus(streak, date).count} stats={progress.data?.stats ?? null}
      reviewCount={reviewReady ? review?.count ?? 0 : null} reviewHint={review?.hint ?? ""}
      due={notes ? dueNotes(notes, now) : []} upcoming={notes ? upcomingNotes(notes, now).slice(0, 8) : []} notesError={notesError}
      now={now} onStart={onStart} onOpen={onOpen} onRetry={onRetry}
    />
    <div className="flex flex-col gap-4 lg:hidden">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg-muted">Ready for today&apos;s spark?</p>
          <h1 className="text-3xl font-extrabold leading-tight text-fg-strong">Kindling</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatChips streakCount={getStreakStatus(streak, date).count} xp={progress.data?.stats.xp ?? 0} />
          <SignOutButton />
        </div>
      </header>

      <PendingBanner />

      {progress.loading && <LoadingView text="Loading your progress" />}
      {progress.error && <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{progress.error}</pre>}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          {progress.data && <GoalCard stats={progress.data.stats} date={date} />}

          <PlanCard plan={plan} onStart={onStart} onOpen={onOpen} onRetry={onRetry} />

        </div>
        <div className="flex flex-col gap-4">
          {/* Judge "nothing due" only once the notes have loaded (or failed), so it never flashes while they are still coming. */}
          {progress.data && (notes || notesError) && (
            <ReviewRow dueCards={dueCards(progress.data.cards, date).length} totalCards={progress.data.cards.length} dueNotes={notes ? dueNotes(notes).length : 0} totalNotes={notes?.length ?? 0} />
          )}
          <DueNotes notes={notes ?? []} error={notesError} />

          <section aria-label="Keep exploring">
            <h2 className="mb-3 text-lg font-extrabold text-fg-strong">Keep exploring</h2>
            <div className="grid grid-cols-2 gap-3">
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
      </div>
    </div>
    </>
  );
}
