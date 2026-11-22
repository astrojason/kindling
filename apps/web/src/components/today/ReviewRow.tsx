import Link from "next/link";

export function ReviewRow({ dueCount, totalCount }: { dueCount: number; totalCount: number }) {
  const hint = totalCount === 0 ? "Finish a lesson to unlock" : dueCount === 0 ? "Nothing due right now" : `${dueCount} ${dueCount === 1 ? "card" : "cards"} due`;
  return (
    <section aria-label="Review" className="flex items-center gap-4 rounded-md bg-surface p-5 shadow-sm">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-extrabold text-accent">{dueCount}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-extrabold text-fg-strong">Review</h2>
        <p className="text-sm text-fg-muted">{hint}</p>
      </div>
      {dueCount > 0 ? (
        <Link href="/review" className="rounded-full bg-accent px-5 py-2.5 text-sm font-extrabold text-accent-fg">Start</Link>
      ) : (
        <span className="rounded-full bg-accent-soft px-5 py-2.5 text-sm font-extrabold text-fg-muted">Done</span>
      )}
    </section>
  );
}
