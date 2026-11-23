"use client";

import { useState } from "react";
import { LoadingView } from "@/components/lesson/LoadingView";
import { getCompletedSessions } from "@/lib/notes-firestore";
import { useLoad } from "@/lib/useLoad";
import { MarkdownBody } from "./MarkdownBody";
import { StrengthBar } from "./StrengthBar";

/** A note's finished quiz sessions, newest first, each opening into its transcript; nothing at all when there are none. */
export function PastSessions({ uid, noteId }: { uid: string; noteId: string }) {
  const state = useLoad(`past-sessions-${uid}-${noteId}`, () => getCompletedSessions(uid, noteId));
  const [open, setOpen] = useState<string | null>(null);

  if (state.loading) return <LoadingView text="Loading sessions" />;
  if (state.error) return <pre role="alert" className="mt-6 whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">Could not load past sessions: {state.error}</pre>;
  const sessions = state.data ?? [];
  if (sessions.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-accent">Past sessions</h2>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="rounded-sm border border-border">
            <button
              type="button"
              aria-expanded={open === s.id}
              onClick={() => setOpen(open === s.id ? null : s.id)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold text-fg-strong"
            >
              <span>{s.completed_at?.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              {s.self_rating != null && <StrengthBar value={s.self_rating} />}
            </button>
            {open === s.id && (
              <div className="space-y-2 border-t border-border px-3.5 py-3">
                {s.messages.map((m, i) =>
                  m.role === "assistant" ? (
                    <div key={i} className="rounded-sm bg-accent-soft px-3 py-2"><MarkdownBody>{m.content}</MarkdownBody></div>
                  ) : (
                    <p key={i} className="ml-6 whitespace-pre-wrap rounded-sm border border-border px-3 py-2 text-sm text-fg">{m.content}</p>
                  ),
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
