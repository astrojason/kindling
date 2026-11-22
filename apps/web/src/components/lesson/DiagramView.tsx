"use client";

import { useState } from "react";
import type { LessonDiagram } from "@/lib/types";

/** The dark blueprint panel: caps title, red label tags that open a note when tapped, and a key-principles box. */
export function DiagramView({ diagram }: { diagram: LessonDiagram }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section aria-label="Diagram" className="my-6 rounded-md bg-blueprint bg-[linear-gradient(var(--color-blueprint-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-blueprint-line)_1px,transparent_1px)] bg-[length:1.5rem_1.5rem] p-5 text-blueprint-fg">
      <h2 className="text-center text-lg font-extrabold uppercase leading-snug tracking-wide">{diagram.title}</h2>
      <p className="mb-5 mt-1 text-center text-xs font-semibold uppercase tracking-wider text-blueprint-muted">{diagram.subtitle}</p>
      <ul className="mb-5 border-l-2 border-blueprint-tag pl-4">
        {diagram.labels.map((label, i) => (
          <li key={label.term} className="relative mb-3 last:mb-0">
            <span aria-hidden="true" className="absolute -left-[1.4rem] top-4 size-2.5 rounded-full bg-blueprint-tag" />
            <button
              type="button"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full rounded-sm bg-blueprint-tag px-3.5 py-2.5 text-left text-sm font-extrabold text-blueprint-fg"
            >
              {label.term}
            </button>
            {open === i && <p className="mt-1.5 rounded-sm bg-blueprint-line px-3.5 py-2 text-sm leading-relaxed text-blueprint-fg">{label.note}</p>}
          </li>
        ))}
      </ul>
      <div className="rounded-sm border border-blueprint-muted p-3.5">
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider">Key principles</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-blueprint-fg">
          {diagram.principles.map((principle) => <li key={principle}>{principle}</li>)}
        </ul>
      </div>
    </section>
  );
}
