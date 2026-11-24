import { CATEGORIES } from "@/lib/categories";
import type { PlanItem } from "@/lib/lesson-plan";

function rowStatus(item: PlanItem): string {
  if (item.status === "ready") return item.done ? "Done" : `${item.minutes} min`;
  if (item.status === "error") return "Failed";
  return item.status === "generating" ? "Preparing…" : "Queued";
}

/** The purple hero card: today's lessons (enough to cover the daily goal), each openable once ready. */
export function PlanCard({ plan, onStart, onOpen, onRetry }: { plan: PlanItem[]; onStart: () => void; onOpen: (key: string) => void; onRetry: () => void }) {
  const doneCount = plan.filter((item) => item.done).length;
  const totalMinutes = plan.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
  const next = plan.find((item) => item.status === "ready" && !item.done);
  const failed = plan.some((item) => item.status === "error");
  const preparing = plan.some((item) => item.status === "queued" || item.status === "generating");
  return (
    <section aria-label="Today's plan" className="rounded-lg bg-gradient-to-b from-hero-from to-hero-to p-5 text-hero-fg shadow-lg">
      <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">Today&apos;s plan</p>
      <p className="mb-4 mt-1 text-sm opacity-90">~{totalMinutes} min · {plan.length} {plan.length === 1 ? "lesson" : "lessons"} · {doneCount} of {plan.length} done</p>
      <ul className="mb-4 flex flex-col gap-2">
        {plan.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              disabled={item.status !== "ready"}
              onClick={() => onOpen(item.key)}
              className={`flex w-full items-center gap-3 rounded-md p-3 text-left text-fg-strong ${item.done ? "bg-surface/70" : "bg-surface"}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-button bg-accent-soft text-sm font-extrabold text-accent" aria-hidden="true">
                {item.done ? "✓" : item.slot}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-accent">{item.category ? CATEGORIES[item.category] : `Lesson ${item.slot}`}</span>
                <span className="block truncate text-sm font-extrabold">{item.title ?? (item.status === "error" ? "Could not prepare this lesson" : "Getting this lesson ready")}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
                {(item.status === "generating") && <span className="size-3.5 animate-spin rounded-full border-2 border-accent-soft border-t-accent" />}
                {rowStatus(item)}
              </span>
            </button>
            {item.error && <pre role="alert" className="mt-1 whitespace-pre-wrap rounded-sm bg-surface p-2.5 text-xs text-rust select-all">{item.error}</pre>}
          </li>
        ))}
      </ul>
      {failed && (
        <button type="button" onClick={onRetry} className="mb-3 w-full rounded-md border-2 border-hero-fg/60 py-2.5 text-sm font-extrabold">Try preparing the rest again</button>
      )}
      <button
        type="button"
        disabled={!next && !preparing}
        onClick={next ? onStart : undefined}
        className="w-full rounded-md bg-surface py-4 text-lg font-extrabold text-accent shadow-sm disabled:opacity-80"
      >
        {next ? (doneCount > 0 ? "Continue today’s plan" : "Start today’s plan") : preparing ? "Preparing your lessons…" : "Review today’s lessons"}
      </button>
    </section>
  );
}
