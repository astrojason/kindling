"use client";

import { useState } from "react";
import type { TrueFalseStatement } from "@/lib/types";

/** Judge each statement true or false; the answer shows right away and wrong answers count as misses. */
export function TrueFalseGame({ statements, onFinish }: { statements: TrueFalseStatement[]; onFinish: (misses: number) => void }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [misses, setMisses] = useState(0);
  const current = statements[index];

  function next() {
    if (index + 1 < statements.length) {
      setIndex(index + 1);
      setAnswer(null);
    } else {
      onFinish(misses);
    }
  }

  function choose(value: boolean) {
    setAnswer(value);
    if (value !== current.isTrue) setMisses(misses + 1);
  }

  const answered = answer !== null;
  const right = answered && answer === current.isTrue;
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-fg-muted">Statement {index + 1} of {statements.length}</p>
      <p className="mb-4 text-lg font-extrabold text-fg-strong">{current.statement}</p>
      <div className="flex gap-3">
        {[true, false].map((value) => (
          <button key={String(value)} type="button" disabled={answered} onClick={() => choose(value)}
            className="flex-1 rounded-md border-2 border-border bg-surface-raised py-3.5 text-base font-extrabold text-fg-strong disabled:opacity-60">
            {value ? "True" : "False"}
          </button>
        ))}
      </div>
      {answered && (
        <>
          <p role="status" className={`mt-4 text-sm font-bold ${right ? "text-success" : "text-rust"}`}>{right ? "Correct" : `Not quite — that statement is ${current.isTrue ? "true" : "false"}.`}</p>
          <button type="button" onClick={next} className="mt-3 rounded-full bg-accent px-6 py-2.5 text-sm font-extrabold text-accent-fg">
            {index + 1 < statements.length ? "Next" : "Finish"}
          </button>
        </>
      )}
    </div>
  );
}
