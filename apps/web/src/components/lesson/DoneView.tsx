"use client";

import { useState } from "react";
import { GameView } from "@/components/games/GameView";
import { DeepLinks } from "@/components/lesson/DeepLinks";
import { ExplainBack } from "@/components/lesson/ExplainBack";
import { LessonBody } from "@/components/lesson/LessonBody";
import { useToast } from "@/components/Toast";
import { QuizReview } from "@/components/lesson/QuizReview";
import { ShareLessonButton } from "@/components/share/ShareButton";
import { CATEGORIES } from "@/lib/categories";
import { gameFor } from "@/lib/games";
import type { DailyProgress, Lesson } from "@/lib/types";

export function DoneView({
  lesson,
  date,
  progress,
  onMore,
  onLess,
  uid,
  earnedXp,
  rewardError,
}: {
  lesson: Lesson;
  date: string;
  progress: DailyProgress;
  onMore: () => Promise<void>;
  onLess: () => Promise<void>;
  uid?: string;
  earnedXp?: number | null;
  rewardError?: string | null;
}) {
  const [flashed, setFlashed] = useState<"more" | "less" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gamePlayed, setGamePlayed] = useState(!!progress.gamePlayed);
  const toast = useToast();
  const game = gameFor(lesson, date);

  async function handle(kind: "more" | "less", action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      setFlashed(kind);
      const topic = CATEGORIES[lesson.category];
      toast(kind === "more" ? `You'll see more ${topic} lessons.` : `You'll see fewer ${topic} lessons.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your preference.");
    }
  }

  return (
    <div>
      <LessonBody lesson={lesson} />
      <div className="py-6 text-center">
        <p className="mb-1.5 font-heading text-2xl font-extrabold text-fg-strong">
          {progress.correct} of {progress.total} today
        </p>
        {!!earnedXp && <p role="status" className="mb-2 text-sm font-extrabold text-accent">+{earnedXp} points</p>}
        {rewardError && <pre role="alert" className="mx-auto mb-3 max-w-full whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-left text-xs text-rust select-all">{rewardError}</pre>}
        <p className="mb-4 text-[13.5px] text-fg-muted">
          Today&apos;s topic: {CATEGORIES[lesson.category]}. Come back tomorrow for the next one.
        </p>
        <ExplainBack lesson={lesson} />
        <div className="flex justify-center">
          <DeepLinks lesson={lesson} />
        </div>
        <div className="mb-5"><ShareLessonButton lesson={lesson} date={date} /></div>
        <p className="mb-3 text-[13.5px] text-fg-muted">Want more or less of {CATEGORIES[lesson.category]} in future lessons?</p>
        <div className="flex justify-center gap-2.5">
          <button
            type="button"
            disabled={flashed === "less"}
            onClick={() => handle("less", onLess)}
            className="rounded-full border-2 border-border px-5 py-2.5 text-sm font-extrabold text-fg-muted transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {flashed === "less" ? "Got it" : "Show less of this"}
          </button>
          <button
            type="button"
            disabled={flashed === "more"}
            onClick={() => handle("more", onMore)}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-extrabold text-accent-fg transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {flashed === "more" ? "Got it" : "Show more of this"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-rust">{error}</p>}
      </div>
      {uid && game && <GameView uid={uid} date={date} game={game} played={gamePlayed} onPlayed={() => setGamePlayed(true)} />}
      {progress.answers && <QuizReview lesson={lesson} answers={progress.answers} />}
    </div>
  );
}
