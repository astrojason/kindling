"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Note } from "@random-knowledge/shared/notes";
import { ageLabel, dueLabel, filterNotes, reviewedLabel, sortNotes, type NoteSort } from "@random-knowledge/shared/notes-view";
import { getUniqueTags } from "@random-knowledge/shared/tags";
import { StrengthBar } from "./StrengthBar";

const SORTS: NoteSort[] = ["recent", "strength", "tag"];
const chip = (active: boolean) =>
  `shrink-0 rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-accent text-accent-fg" : "border border-border text-fg-muted hover:border-accent"}`;

/** The notes archive: search, tag chips and sort over a list that links to each note. */
export function NotesLibrary({ notes, error = null, now = new Date() }: { notes: Note[]; error?: string | null; now?: Date }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<NoteSort>("recent");

  const tags = useMemo(() => ["all", ...getUniqueTags(notes)], [notes]);
  const visible = useMemo(() => sortNotes(filterNotes(notes, { query, tag }), sort), [notes, query, tag, sort]);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-fg-strong">Notes</h1>
          <p className="text-xs text-fg-muted">{visible.length === notes.length ? `${notes.length} notes` : `${visible.length} of ${notes.length}`}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/discover" className="text-sm font-bold text-fg-muted hover:text-fg">Discover</Link>
          <Link href="/notes/new" className="rounded-full bg-accent px-4 py-2 text-sm font-extrabold text-accent-fg hover:opacity-85">
            Capture
          </Link>
        </div>
      </div>

      {error && <pre role="alert" className="mb-4 whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>}

      {notes.length === 0 && !error ? (
        <p className="py-6 text-center text-sm text-fg-muted">No notes yet. Capture something you want to remember.</p>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or tag…"
            aria-label="Search notes"
            className="mb-3 w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          <div className="mb-3 flex items-center gap-3 text-xs">
            <span className="text-fg-muted">Sort</span>
            {SORTS.map((s) => (
              <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={sort === s ? "font-extrabold text-accent" : "font-bold text-fg-muted"}>
                {s}
              </button>
            ))}
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {tags.map((t) => (
              <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className={chip(tag === t)}>
                {t}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">No notes match.</p>
          ) : (
            <ul className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {visible.map((n) => (
                <li key={n.id}>
                  <Link href={`/notes/${n.id}`} className="block rounded-sm border border-border px-3.5 py-3 hover:border-accent">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-accent">{n.tag}</span>
                    <span data-title className="block text-sm font-semibold text-fg-strong">{n.title}</span>
                    <span className="mt-1 block text-xs text-fg-muted">
                      added {ageLabel(n.created_at, now)} · reviewed {reviewedLabel(n.last_reviewed_at, now)} · <span className={dueLabel(n.next_review_at, now) === "due now" ? "font-extrabold text-rust" : undefined}>{dueLabel(n.next_review_at, now)}</span>
                    </span>
                    {n.last_rating != null && <span className="mt-2 block"><StrengthBar value={n.last_rating} /></span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
