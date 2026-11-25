"use client";

import { nowMs } from "@/lib/clock";
import { useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { addStats, saveReviewCard } from "@/lib/firestore";
import { rateCard } from "@/lib/srs";
import { reviewXp } from "@/lib/xp";
import type { ReviewCard, ReviewRating } from "@/lib/types";

const RATINGS: { rating: ReviewRating; label: string; style: string }[] = [
  { rating: "again", label: "Again", style: "bg-rust-soft text-rust" },
  { rating: "hard", label: "Hard", style: "bg-accent-soft text-accent" },
  { rating: "good", label: "Good", style: "bg-correct text-success" },
  { rating: "easy", label: "Easy", style: "bg-accent text-accent-fg" },
];
const MAX_CARD_SECONDS = 120;

/** Works through the due cards: think, show the answer, rate it. Each rating saves the card's new schedule and the points. */
export function ReviewSession({ uid, today, cards, onFinished }: { uid: string; today: string; cards: ReviewCard[]; onFinished?: () => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState<ReviewRating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earned, setEarned] = useState(0);
  const shownAt = useRef(nowMs());
  const card = cards[index];

  async function rate(rating: ReviewRating) {
    setSaving(rating);
    setError(null);
    try {
      const seconds = Math.min(Math.round((nowMs() - shownAt.current) / 1000), MAX_CARD_SECONDS);
      const xp = reviewXp(rating);
      await saveReviewCard(uid, rateCard(card, rating, today));
      await addStats(uid, today, { xp, seconds });
      setEarned((total) => total + xp);
      setRevealed(false);
      shownAt.current = nowMs();
      setIndex(index + 1);
      if (index + 1 >= cards.length) onFinished?.();
    } catch (err) {
      console.error("Failed to save the review rating:", err);
      setError(err instanceof Error ? err.message : "Could not save your rating.");
    } finally {
      setSaving(null);
    }
  }

  if (!card) {
    return (
      <div className="py-10 text-center">
        <p className="mb-1 text-2xl font-extrabold text-fg-strong">All caught up</p>
        <p role="status" className="text-sm text-fg-muted">You reviewed {cards.length} {cards.length === 1 ? "card" : "cards"} and earned {earned} points.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-xs font-bold text-fg-muted">Card {index + 1} of {cards.length} · {CATEGORIES[card.category]}</p>
      <p className="mb-4 text-xl font-extrabold text-fg-strong">{card.question}</p>
      {!revealed ? (
        <button type="button" onClick={() => setRevealed(true)} className="w-full rounded-button bg-accent py-3.5 text-base font-extrabold text-accent-fg">Show answer</button>
      ) : (
        <>
          <p className="mb-2 rounded-button border-2 border-success bg-correct px-3.5 py-3 text-[15px] font-bold text-fg-strong">{card.options[card.correctIndex]}</p>
          <p className="mb-4 text-sm italic leading-relaxed text-fg-muted">{card.explanation}</p>
          <p className="mb-2 text-xs font-bold text-fg-muted">How well did you know it?</p>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map(({ rating, label, style }) => (
              <button key={rating} type="button" disabled={saving !== null} onClick={() => void rate(rating)}
                className={`rounded-button py-3 text-sm font-extrabold disabled:opacity-60 ${style}`}>
                {saving === rating ? "Saving…" : label}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <pre role="alert" className="mt-3 whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>}
    </div>
  );
}
