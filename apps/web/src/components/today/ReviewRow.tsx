import Link from "next/link";
import { reviewSummary } from "@random-knowledge/shared/review-summary";

/** The Review row on Today: lesson cards and notes that are due, with a way into Review. */
export function ReviewRow({ dueCards, totalCards, dueNotes, totalNotes }: { dueCards: number; totalCards: number; dueNotes: number; totalNotes: number }) {
  const { count, hint } = reviewSummary({ dueCards, totalCards, dueNotes, totalNotes });
  return (
    <section aria-label="Review" className="flex items-center gap-4 rounded-md bg-surface p-5 shadow-sm">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-extrabold text-accent">{count}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-extrabold text-fg-strong">Review</h2>
        <p className="text-sm text-fg-muted">{hint}</p>
      </div>
      {count > 0 ? (
        <Link href="/review" className="rounded-full bg-accent px-5 py-2.5 text-sm font-extrabold text-accent-fg">Start</Link>
      ) : (
        <span className="rounded-full bg-accent-soft px-5 py-2.5 text-sm font-extrabold text-fg-muted">Done</span>
      )}
    </section>
  );
}
