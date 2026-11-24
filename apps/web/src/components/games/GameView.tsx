"use client";

import { baseDate } from "@/lib/lesson-plan";
import { nowMs } from "@/lib/clock";
import { useRef, useState } from "react";
import { OrderGame } from "@/components/games/OrderGame";
import { PairsGame } from "@/components/games/PairsGame";
import { TrueFalseGame } from "@/components/games/TrueFalseGame";
import { addStats, markGamePlayed } from "@/lib/firestore";
import type { Game } from "@/lib/games";
import { gameXp } from "@/lib/xp";

const TITLES: Record<Game["kind"], string> = { pairs: "Match pairs", order: "Put in order", trueFalse: "True or false" };
const MAX_SECONDS = 300;

/** The bonus mini-game after a lesson: play once, then points and time are saved with visible progress and errors. */
export function GameView({ uid, date, game, played, onPlayed }: { uid: string; date: string; game: Game; played: boolean; onPlayed: () => void }) {
  const [phase, setPhase] = useState<"idle" | "playing" | "saving" | "done">(played ? "done" : "idle");
  const [earned, setEarned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);

  function start() {
    startedAt.current = nowMs();
    setPhase("playing");
  }

  async function finish(misses: number) {
    const xp = gameXp(misses);
    const seconds = Math.min(Math.round((nowMs() - startedAt.current) / 1000), MAX_SECONDS);
    setPhase("saving");
    setError(null);
    try {
      await addStats(uid, baseDate(date), { xp, seconds });
      await markGamePlayed(uid, date);
      setEarned(xp);
      setPhase("done");
      onPlayed();
    } catch (err) {
      console.error("Failed to save the mini-game result:", err);
      setError(err instanceof Error ? err.message : "Could not save your game result.");
      setPhase("playing");
    }
  }

  const seed = `${date}-${game.kind}`;
  return (
    <section aria-label="Bonus game" className="my-6 rounded-md bg-accent-soft p-5">
      <h2 className="mb-1 text-lg font-extrabold text-fg-strong">Bonus game: {TITLES[game.kind]}</h2>
      {phase === "idle" && (
        <>
          <p className="mb-3 text-sm text-fg-muted">A quick round for bonus points.</p>
          <button type="button" onClick={start} className="rounded-button bg-accent px-4 py-1.5 text-sm font-extrabold text-accent-fg">Play</button>
        </>
      )}
      {phase === "playing" && (
        <div className="mt-2">
          {game.kind === "pairs" && <PairsGame pairs={game.pairs} seed={seed} onFinish={finish} />}
          {game.kind === "order" && <OrderGame prompt={game.prompt} items={game.items} seed={seed} onFinish={finish} />}
          {game.kind === "trueFalse" && <TrueFalseGame statements={game.statements} onFinish={finish} />}
        </div>
      )}
      {phase === "saving" && <p role="status" className="text-sm font-bold text-fg-muted">Saving your points…</p>}
      {phase === "done" && (
        <p role="status" className="text-sm font-bold text-success">{earned !== null ? `Nice! +${earned} points` : "You played today’s game."}</p>
      )}
      {error && <pre role="alert" className="mt-3 whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>}
    </section>
  );
}
