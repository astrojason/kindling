"use client";

import { useMemo, useState } from "react";
import { shuffleSeeded } from "@/lib/games";
import type { MatchPair } from "@/lib/types";

/** Match 4 terms to their meanings: pick one of each; a wrong pair flashes and counts as a miss. */
export function PairsGame({ pairs, seed, onFinish }: { pairs: MatchPair[]; seed: string; onFinish: (misses: number) => void }) {
  const meanings = useMemo(() => shuffleSeeded(pairs.map((p) => p.meaning), seed), [pairs, seed]);
  const [term, setTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);

  function pickMeaning(meaning: string) {
    if (!term) return;
    const pair = pairs.find((p) => p.term === term)!;
    if (pair.meaning === meaning) {
      const next = [...matched, term];
      setMatched(next);
      setTerm(null);
      setWrong(null);
      if (next.length === pairs.length) onFinish(misses);
    } else {
      setMisses(misses + 1);
      setWrong(meaning);
    }
  }

  const base = "w-full rounded-button border-2 px-3.5 py-3 text-left text-sm font-bold transition-colors";
  return (
    <div>
      <p className="mb-3 text-sm text-fg-muted">Tap a term, then its meaning.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {pairs.map((p) => (
            <button key={p.term} type="button" disabled={matched.includes(p.term)} onClick={() => { setTerm(p.term); setWrong(null); }}
              className={`${base} ${matched.includes(p.term) ? "border-success bg-correct text-fg" : term === p.term ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-raised text-fg-strong"}`}>
              {p.term}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {meanings.map((m) => {
            const done = matched.includes(pairs.find((p) => p.meaning === m)!.term);
            return (
              <button key={m} type="button" disabled={done || !term} onClick={() => pickMeaning(m)}
                className={`${base} ${done ? "border-success bg-correct text-fg" : wrong === m ? "border-rust bg-incorrect text-fg" : "border-border bg-surface-raised text-fg"}`}>
                {m}
              </button>
            );
          })}
        </div>
      </div>
      <p role="status" className="mt-3 text-xs text-fg-muted">{matched.length} of {pairs.length} matched{misses ? ` · ${misses} ${misses === 1 ? "miss" : "misses"}` : ""}</p>
    </div>
  );
}
