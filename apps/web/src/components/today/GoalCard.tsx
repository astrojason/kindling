import { GoalRing } from "@/components/today/GoalRing";
import { goalFraction, minutesOn, weekDays } from "@/lib/xp";
import type { StatsData } from "@/lib/types";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function GoalCard({ stats, date }: { stats: StatsData; date: string }) {
  return (
    <section aria-label="Daily goal" className="flex items-center gap-5 rounded-md bg-surface p-5 shadow-sm">
      <GoalRing minutes={minutesOn(stats, date)} fraction={goalFraction(stats, date)} />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-extrabold text-fg-strong">Daily goal</h2>
        <p className="mb-3 text-sm text-fg-muted">{minutesOn(stats, date)} of {stats.goalMinutes} minutes today</p>
        <ol className="flex gap-1.5">
          {weekDays(date).map((day, i) => {
            const learned = (stats.seconds[day] ?? 0) > 0;
            const today = day === date;
            return (
              <li
                key={day}
                aria-label={`${day}${learned ? ", learned" : ""}`}
                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${learned ? "bg-accent text-accent-fg" : today ? "border-2 border-accent text-accent" : "bg-accent-soft text-fg-muted"}`}
              >
                {WEEKDAY_LETTERS[i]}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
