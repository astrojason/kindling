"use client";

import { useEffect, useMemo, useState } from "react";
import { focalIndex, tokenize } from "@random-knowledge/shared/rsvp";

const DEFAULT_WPM = 300;
const MIN_WPM = 100;
const MAX_WPM = 1000;
const WPM_STEP = 25;
const controlClass = "rounded-sm border border-border px-3 py-3 text-xs font-bold uppercase tracking-wide text-fg-muted hover:border-accent";

/** Full-screen RSVP reader: one word at a time with the focal letter highlighted. Space plays, R restarts, Esc closes. */
export function SpeedReader({ text, onClose }: { text: string; onClose: () => void }) {
  const words = useMemo(() => tokenize(text), [text]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState(DEFAULT_WPM);
  const last = words.length - 1;
  // Reaching the last word stops playback without an effect having to switch `playing` off.
  const isPlaying = playing && index < last;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), 60_000 / wpm);
    return () => clearTimeout(timer);
  }, [isPlaying, index, wpm]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "r" || e.key === "R") restart();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function togglePlay() {
    if (words.length === 0) return;
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    if (index >= last) setIndex(0);
    setPlaying(true);
  }

  function restart() {
    setIndex(0);
    setPlaying(false);
  }

  const word = words[index] ?? "";
  const focal = focalIndex(word);
  const progress = last > 0 ? Math.round((index / last) * 100) : words.length ? 100 : 0;

  return (
    <div role="dialog" aria-label="Speed reader" className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between px-5 pt-6 text-xs font-bold uppercase tracking-wide text-fg-muted">
        <span>Reading at {wpm} WPM</span>
        <button type="button" onClick={onClose} aria-label="close" className="hover:text-fg">✕ close</button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        {words.length === 0 ? (
          <p className="text-fg-muted">Nothing to read.</p>
        ) : (
          <div data-testid="rsvp-word" aria-live="off" className="grid w-full max-w-[900px] grid-cols-[1fr_auto_1fr] text-4xl leading-none text-fg-strong md:text-6xl">
            <span className="text-right">{word.slice(0, focal)}</span>
            <span className="text-accent">{word[focal]}</span>
            <span className="text-left">{word.slice(focal + 1)}</span>
          </div>
        )}
      </div>

      <div className="px-5 pb-8">
        <progress value={progress} max={100} aria-label="Progress" className="h-1 w-full accent-accent" />
        <p className="mt-2 text-xs text-fg-muted">{progress}%</p>
        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={restart} aria-label="restart" className={controlClass}>⏮</button>
          <button type="button" onClick={togglePlay} aria-label={isPlaying ? "pause" : "play"} className="flex-1 rounded-sm border border-accent px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-accent hover:bg-accent-soft md:flex-none">
            {isPlaying ? "❚❚ pause" : "▶ play"}
          </button>
          <button type="button" onClick={() => setWpm((w) => Math.max(MIN_WPM, w - WPM_STEP))} aria-label="slower" className={controlClass}>−</button>
          <button type="button" onClick={() => setWpm((w) => Math.min(MAX_WPM, w + WPM_STEP))} aria-label="faster" className={controlClass}>+</button>
        </div>
        <p className="mt-3 text-xs text-fg-muted">Space = play/pause · R = restart · Esc = close</p>
      </div>
    </div>
  );
}
