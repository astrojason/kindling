import Link from "next/link";
import { PendingBanner } from "@/components/admin/PendingBanner";
import { CATEGORIES } from "@/lib/categories";
import { formatDateLabel } from "@/lib/date";
import type { PlanItem } from "@/lib/lesson-plan";
import type { Note } from "@random-knowledge/shared/notes";
import { dueDateLabel, dueLabel } from "@random-knowledge/shared/notes-view";
import type { StatsData } from "@/lib/types";
import { levelFor, minutesOn, weekDays } from "@/lib/xp";
import { SignOutButton } from "@/components/nav/SignOutButton";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const label = "text-xs font-black tracking-[0.1em] text-fg-muted";

function rowStatus(item: PlanItem): string {
  if (item.status === "ready") return item.done ? "Done" : `${item.minutes} min`;
  if (item.status === "error") return "Failed";
  return item.status === "generating" ? "Preparing…" : "Queued";
}

function NoteRow({ note, now, due }: { note: Note; now: Date; due: boolean }) {
  return (
    <Link href={`/notes/${note.id}`} className="flex items-baseline justify-between gap-3 border-b border-border py-2.5 hover:bg-accent-soft">
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-black uppercase tracking-[0.06em] text-accent">{note.tag}</span>
        <span className="truncate text-[15px] font-bold text-fg-strong">{note.title}</span>
      </span>
      <span className={`whitespace-nowrap text-xs ${due ? "text-rust" : "text-fg-muted"}`}>{(due ? dueLabel : dueDateLabel)(note.next_review_at, now)}</span>
    </Link>
  );
}

/**
 * The Today screen on a desktop: a header bar, the next lesson as a full-width hero beside the daily goal, today's plan
 * as a strip, and review, notes to recall and what is coming up in three columns. Hidden on a phone (see `TodayHome`).
 */
export function DesktopToday({
  date, plan, streakCount, stats, reviewCount, reviewHint, due, upcoming, notesError, now, onStart, onOpen, onRetry,
}: {
  date: string;
  plan: PlanItem[];
  streakCount: number;
  stats: StatsData | null;
  reviewCount: number | null;
  reviewHint: string;
  due: Note[];
  upcoming: Note[];
  notesError: string | null;
  now: Date;
  onStart: () => void;
  onOpen: (key: string) => void;
  onRetry: () => void;
}) {
  const xp = stats?.xp ?? 0;
  const next = plan.find((item) => item.status === "ready" && !item.done);
  const doneCount = plan.filter((item) => item.done).length;
  const failed = plan.some((item) => item.status === "error");
  const preparing = plan.some((item) => item.status === "queued" || item.status === "generating");
  const allDone = !next && !preparing && !failed && plan.length > 0;
  const minutes = stats ? minutesOn(stats, date) : 0;
  const goal = stats?.goalMinutes ?? 0;
  const ctaLabel = next ? (doneCount > 0 ? "Continue today’s plan" : "Start today’s plan") : preparing ? "Preparing your lessons…" : "Review today’s lessons";

  return (
    <div className="hidden min-h-screen flex-col lg:flex">
      <header className="flex h-16 flex-none items-center justify-between border-b border-border bg-surface px-12">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-black text-fg-strong">Kindling</span>
          <span className="text-sm font-bold text-fg-muted">{formatDateLabel(date)}</span>
        </div>
        <div className="flex items-center gap-5 text-sm font-extrabold text-fg-strong">
          <span className="flex items-center gap-1.5" aria-label={`${streakCount} day streak`}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-gold" aria-hidden="true"><path d="M10 1.5c.4 2.3-.6 3.7-1.9 5.1-1.4 1.5-3 3.2-3 5.9a4.9 4.9 0 0 0 9.8 0c0-1.7-.7-2.9-1.5-3.9-.1.9-.5 1.7-1.2 2.3.2-2.4-.7-3.7-2.2-6.1Z" /></svg>
            {streakCount} day streak
          </span>
          <span className="flex items-center gap-1.5" aria-label={`${xp} points, level ${levelFor(xp)}`}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-accent" aria-hidden="true"><path d="m10 1.8 2.3 5.1 5.5.6-4.1 3.7 1.2 5.5L10 14l-4.9 2.7 1.2-5.5L2.2 7.5l5.5-.6Z" /></svg>
            {xp.toLocaleString()} XP · Level {levelFor(xp)}
          </span>
          <SignOutButton />
        </div>
      </header>

      <PendingBanner strip />

      <section aria-label="Today's plan" className="grid flex-none grid-cols-[minmax(0,1fr)_320px] gap-16 bg-gradient-to-b from-hero-from to-hero-to px-12 pb-10 pt-11 text-hero-fg">
        <div className="flex flex-col gap-3.5">
          <p className="text-sm font-extrabold opacity-80">Ready for today&apos;s spark?</p>
          {next && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-black uppercase tracking-[0.08em] opacity-80">
                Lesson {next.slot} of {plan.length}{next.category ? ` · ${CATEGORIES[next.category]}` : ""}{next.minutes ? ` · ${next.minutes} min` : ""}
              </span>
              <h2 className="text-[56px] font-black leading-[1.04] tracking-[-0.015em] text-pretty">{next.title}</h2>
            </div>
          )}
          {allDone && <h2 className="text-5xl font-black leading-[1.08]">You showed up today. Come back tomorrow for another discovery.</h2>}
          <div className="mt-2.5 flex gap-3">
            <button type="button" disabled={!next} onClick={onStart} className="rounded-button bg-white px-7 py-[15px] text-base font-black text-hero-to disabled:opacity-80">{ctaLabel}</button>
            {failed && <button type="button" onClick={onRetry} className="rounded-button border border-white/55 px-5 py-3.5 text-[15px] font-extrabold">Try preparing the rest again</button>}
          </div>
        </div>
        <div className="flex flex-col justify-end gap-3 border-l border-white/20 pl-8">
          <p className="text-xs font-black tracking-[0.1em] opacity-80">DAILY GOAL</p>
          <p className="flex items-baseline gap-1.5"><span className="text-[44px] font-black leading-none">{minutes}</span><span className="text-[15px] font-bold opacity-80">/ {goal} min today</span></p>
          <svg role="progressbar" aria-label="Daily goal progress" aria-valuenow={minutes} aria-valuemax={goal} className="h-[5px] w-full" viewBox="0 0 100 5" preserveAspectRatio="none">
            <rect width="100" height="5" className="fill-white/20" />
            <rect width={goal ? Math.min(100, (minutes / goal) * 100) : 0} height="5" className="fill-white" />
          </svg>
          <div className="grid grid-cols-7 gap-1">
            {stats && weekDays(date).map((day, i) => {
              const learned = (stats.seconds[day] ?? 0) > 0;
              return <span key={day} className={`rounded-xs py-1 text-center text-xs font-black ${learned ? "bg-white text-hero-to" : "bg-white/15 text-white/80"} ${day === date ? "ring-2 ring-inset ring-white" : ""}`}>{WEEKDAY_LETTERS[i]}</span>;
            })}
          </div>
        </div>
      </section>

      <section className="grid flex-none auto-cols-fr grid-flow-col border-b border-border bg-surface">
        {plan.map((item) => {
          const isNext = item === next;
          const openable = item.status === "ready" && !item.done;
          return (
            <button key={item.key} type="button" disabled={!openable} onClick={() => onOpen(item.key)} className={`flex flex-col gap-1.5 border-r border-border px-12 pb-[26px] pt-6 text-left ${isNext ? "bg-accent-soft" : ""} ${openable ? "cursor-pointer hover:bg-accent-soft" : "cursor-default"}`}>
              <span className="flex justify-between text-[13px] font-black">
                <span className="text-accent">0{item.slot} · {item.category ? CATEGORIES[item.category] : `Lesson ${item.slot}`}</span>
                <span className={item.done ? "text-success" : item.status === "error" ? "text-rust" : isNext ? "text-accent" : "text-fg-muted"}>{rowStatus(item)}</span>
              </span>
              <span className={`text-[19px] font-extrabold leading-tight ${item.done || item.status !== "ready" ? "text-fg-muted" : "text-fg-strong"}`}>
                {item.title ?? (item.status === "error" ? "Could not prepare this lesson" : "Getting this lesson ready")}
              </span>
              {item.error && <span className="text-[13px] text-rust">{item.error}</span>}
            </button>
          );
        })}
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-3">
        <div className="flex flex-col gap-3 border-r border-border px-12 py-7">
          <p className={label}>REVIEW</p>
          {reviewCount === null ? <p className="text-sm text-fg-muted">Loading…</p> : (
            <p className="flex items-baseline gap-2.5"><span className="text-[40px] font-black leading-none text-fg-strong">{reviewCount}</span><span className="text-[15px] text-fg-muted">{reviewHint}</span></p>
          )}
          {reviewCount ? <Link href="/review" className="mt-1 self-start rounded-button bg-accent px-5 py-2.5 text-sm font-extrabold text-accent-fg hover:opacity-90">Start review</Link> : null}
          <div className="mt-auto flex flex-col border-t border-border">
            <Link href="/review" className="flex justify-between border-b border-border py-[11px] text-[15px] font-extrabold text-fg-strong hover:text-accent"><span>Previous lessons <span className="text-[13px] font-bold text-fg-muted">· in Review</span></span><span className="text-accent">→</span></Link>
            <Link href="/review" className="flex justify-between py-[11px] text-[15px] font-extrabold text-fg-strong hover:text-accent"><span>Saved <span className="text-[13px] font-bold text-fg-muted">· from friends</span></span><span className="text-accent">→</span></Link>
          </div>
        </div>
        <div className="flex flex-col border-r border-border px-12 py-7">
          <p className={`${label} mb-1`}>{due.length} {due.length === 1 ? "NOTE" : "NOTES"} TO RECALL</p>
          {notesError && <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{notesError}</pre>}
          {due.map((n) => <NoteRow key={n.id} note={n} now={now} due />)}
        </div>
        <div className="flex min-h-0 flex-col px-12 py-7">
          <p className={`${label} mb-1`}>COMING UP FOR REVIEW</p>
          <div className="flex min-h-0 flex-col overflow-auto">
            {upcoming.map((n) => <NoteRow key={n.id} note={n} now={now} due={false} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
