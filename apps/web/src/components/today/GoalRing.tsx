const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The daily-goal ring: a purple arc filling as minutes accumulate, with the whole minutes inside. */
export function GoalRing({ minutes, fraction }: { minutes: number; fraction: number }) {
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="10" className="stroke-accent-soft" />
        <circle
          cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className="stroke-accent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold leading-none text-fg-strong">{minutes}</span>
        <span className="text-xs font-semibold text-fg-muted">min</span>
      </div>
    </div>
  );
}
