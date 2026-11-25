"use client";

import { useMemo, useState } from "react";
import { isOrderCorrect, shuffleSeeded } from "@/lib/games";

/** Tap the items in their correct order; a wrong tap resets the order and adds a miss. */
export function OrderGame({ prompt, items, seed, onFinish }: { prompt: string; items: string[]; seed: string; onFinish: (misses: number) => void }) {
  const shuffled = useMemo(() => shuffleSeeded(items, seed), [items, seed]);
  const [picked, setPicked] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState(false);

  function pick(item: string) {
    const next = [...picked, item];
    if (items[picked.length] !== item) {
      setMisses(misses + 1);
      setPicked([]);
      setFlash(true);
      return;
    }
    setFlash(false);
    setPicked(next);
    if (isOrderCorrect(next, items)) onFinish(misses);
  }

  return (
    <div>
      <p className="mb-1 text-lg font-extrabold text-fg-strong">{prompt}</p>
      <p className="mb-3 text-sm text-fg-muted">Tap the items in the right order, first to last.</p>
      <div className="flex flex-col gap-2">
        {shuffled.map((item) => {
          const position = picked.indexOf(item);
          return (
            <button key={item} type="button" disabled={position >= 0} onClick={() => pick(item)}
              className={`flex items-center gap-3 rounded-button border-2 px-3.5 py-3 text-left text-sm font-bold ${position >= 0 ? "border-success bg-correct text-fg" : "border-border bg-surface-raised text-fg-strong"}`}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs text-accent">{position >= 0 ? position + 1 : ""}</span>
              {item}
            </button>
          );
        })}
      </div>
      {flash && <p role="alert" className="mt-3 text-sm font-bold text-rust">Not that one — the order reset. Try again.</p>}
    </div>
  );
}
