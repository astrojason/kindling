import { CATEGORIES } from "@/lib/categories";
import { estimateMinutes } from "@/lib/lesson-time";
import type { Lesson } from "@/lib/types";

/** The purple hero card: today's lesson with a big start button. */
export function PlanCard({ lesson, done, onStart }: { lesson: Lesson; done: boolean; onStart: () => void }) {
  return (
    <section aria-label="Today's lesson" className="rounded-lg bg-gradient-to-b from-hero-from to-hero-to p-5 text-hero-fg shadow-lg">
      <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">Today&apos;s lesson</p>
      <p className="mb-4 mt-1 text-sm opacity-90">~{estimateMinutes(lesson)} min · {done ? "1 of 1 done" : "0 of 1 done"}</p>
      <div className="mb-4 flex items-center gap-3 rounded-md bg-surface p-3 text-fg-strong">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-6">
            <path d="M12 6.5C10.3 5 8 4.5 4.5 4.5v13c3.5 0 5.8.5 7.5 2 1.7-1.5 4-2 7.5-2v-13C16 4.5 13.7 5 12 6.5ZM12 6.5v13" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-accent">{CATEGORIES[lesson.category]}</p>
          <p className="truncate text-base font-extrabold">{lesson.title}</p>
        </div>
        <span className="text-xs font-semibold text-fg-muted">{estimateMinutes(lesson)} min</span>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-md bg-surface py-4 text-lg font-extrabold text-accent shadow-sm transition-transform active:scale-[0.99]"
      >
        {done ? "Review today’s lesson" : "Start today’s lesson"}
      </button>
    </section>
  );
}
