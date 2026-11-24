import { CATEGORIES } from "@/lib/categories";
import type { PlanItem } from "@/lib/lesson-plan";

const STEPS: { phase: string[]; label: string }[] = [
  { phase: ["prereview"], label: "Warm up" },
  { phase: ["lesson"], label: "Read" },
  { phase: ["quiz"], label: "Quiz" },
  { phase: ["done"], label: "Results" },
];

/** The desktop side rail beside a lesson: where you are in it, and today's other lessons. Hidden on a phone. */
export function LessonRail({
  phase,
  plan,
  currentKey,
  onOpen,
  onBack,
}: {
  phase: string;
  plan: PlanItem[];
  currentKey: string;
  onOpen: (key: string) => void;
  onBack?: () => void;
}) {
  const current = STEPS.findIndex((step) => step.phase.includes(phase));
  return (
    <aside aria-label="Lesson progress" className="hidden flex-col gap-6 border-l border-border bg-surface px-6 py-10 lg:flex">
      {onBack && (
        <button type="button" onClick={onBack} className="self-start text-sm font-extrabold text-accent hover:underline">
          ‹ Back to Today
        </button>
      )}
      {current >= 0 && (
        <ol className="flex flex-col gap-2 text-sm">
          {STEPS.map((step, i) => (
            <li key={step.label} aria-current={i === current ? "step" : undefined} className={`flex items-center gap-3 font-bold ${i === current ? "text-accent" : i < current ? "text-fg" : "text-fg-muted"}`}>
              <span className={`flex size-6 items-center justify-center rounded-full text-xs ${i <= current ? "bg-accent text-accent-fg" : "bg-accent-soft text-fg-muted"}`}>{i < current ? "✓" : i + 1}</span>
              {step.label}
            </li>
          ))}
        </ol>
      )}
      {plan.length > 1 && (
        <div>
          <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-fg-muted">Today&apos;s plan</h2>
          <ul className="flex flex-col gap-1.5">
            {plan.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={item.status !== "ready" || item.key === currentKey}
                  onClick={() => onOpen(item.key)}
                  className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs font-bold ${item.key === currentKey ? "bg-accent-soft text-accent" : "text-fg hover:bg-accent-soft disabled:text-fg-muted disabled:hover:bg-transparent"}`}
                >
                  <span>{item.done ? "✓" : item.slot}</span>
                  <span className="min-w-0 flex-1 truncate">{item.title ?? (item.category ? CATEGORIES[item.category] : `Lesson ${item.slot}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
