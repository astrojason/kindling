import { levelFor } from "@/lib/xp";

/** The streak and points pills at the top of Today. */
export function StatChips({ streakCount, xp }: { streakCount: number; xp: number }) {
  return (
    <div className="flex gap-2">
      <span aria-label={`${streakCount} day streak`} className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm font-extrabold text-fg-strong shadow-sm">
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-gold" aria-hidden="true">
          <path d="M10 1.5c.4 2.3-.6 3.7-1.9 5.1-1.4 1.5-3 3.2-3 5.9a4.9 4.9 0 0 0 9.8 0c0-1.7-.7-2.9-1.5-3.9-.1.9-.5 1.7-1.2 2.3.2-2.4-.7-3.7-2.2-6.1Z" />
        </svg>
        {streakCount}
      </span>
      <span aria-label={`${xp} points, level ${levelFor(xp)}`} className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm font-extrabold text-fg-strong shadow-sm">
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-accent" aria-hidden="true">
          <path d="m10 1.8 2.3 5.1 5.5.6-4.1 3.7 1.2 5.5L10 14l-4.9 2.7 1.2-5.5L2.2 7.5l5.5-.6Z" />
        </svg>
        {xp}
      </span>
    </div>
  );
}
