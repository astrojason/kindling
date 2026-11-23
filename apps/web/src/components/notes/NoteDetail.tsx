"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Note } from "@random-knowledge/shared/notes";
import { dueLabel } from "@random-knowledge/shared/notes-view";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { decrementNoteCount, softDeleteNote } from "@/lib/notes-firestore";
import { useStudyTimer } from "@/lib/useStudyTimer";
import { MarkdownBody } from "./MarkdownBody";
import { PastSessions } from "./PastSessions";
import { SpeedReader } from "./SpeedReader";
import { StrengthBar } from "./StrengthBar";

/** One reading stretch counts at most this long, so a note left open does not count as hours of study. */
const MAX_READING_SECONDS = 10 * 60;

const actionClass = "rounded-full border-2 border-border px-4 py-2 text-sm font-extrabold text-fg-muted hover:border-accent";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-1 text-xs font-extrabold uppercase tracking-wide text-accent">{title}</h2>
      {children}
    </section>
  );
}

/** One note: its three fields as Markdown, where it stands in its review schedule, and its actions. */
export function NoteDetail({ uid, note }: { uid: string; note: Note }) {
  const router = useRouter();
  const toast = useToast();
  const [speedReading, setSpeedReading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { timer, flush } = useStudyTimer(uid, MAX_READING_SECONDS);

  // Time on the note (reading, speed reading) counts toward the learning goal: counted while the tab is visible,
  // saved when it is hidden or the page is left.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        timer.pause();
        void flush();
      } else {
        timer.start();
      }
    }
    if (document.visibilityState !== "hidden") timer.start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      timer.pause();
      void flush();
    };
  }, [timer, flush]);

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await softDeleteNote(uid, note.id);
    } catch (err) {
      console.error("Failed to delete note", err);
      setDeleteError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
      return;
    }
    try {
      await decrementNoteCount(uid);
      toast("Note deleted.");
    } catch (err) {
      // The note is gone; only its running count is stale, and that must be said, not hidden.
      console.error("Failed to update the notes count", err);
      toast(`Note deleted, but its count could not be updated: ${err instanceof Error ? err.message : String(err)}`);
    }
    router.push("/notes");
  }

  return (
    <article>
      {speedReading && <SpeedReader text={note.what_it_said} onClose={() => setSpeedReading(false)} />}

      <Link href="/notes" className="text-xs font-bold text-fg-muted hover:text-fg">← Notes</Link>
      <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-accent">{note.tag}</p>
      <h1 className="font-heading text-2xl font-bold text-fg-strong">{note.title}</h1>
      {note.source_url && (
        <a href={note.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-accent underline underline-offset-2">
          {note.source_url}
        </a>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-fg-muted">
        <span>Reviews {note.session_count} · next {dueLabel(note.next_review_at)}</span>
        {note.last_rating != null && <StrengthBar value={note.last_rating} />}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/notes/${note.id}/session`} className="rounded-full bg-accent px-4 py-2 text-sm font-extrabold text-accent-fg hover:opacity-85">Quiz me</Link>
        <button type="button" onClick={() => setSpeedReading(true)} className={actionClass}>Speed read</button>
        <Link href={`/notes/${note.id}/edit`} className={actionClass}>Edit</Link>
        <button type="button" onClick={() => setConfirming(true)} className={actionClass}>Delete</button>
      </div>

      <Section title="What did it say?"><MarkdownBody>{note.what_it_said}</MarkdownBody></Section>
      <Section title="Why does it matter?"><MarkdownBody>{note.why_it_matters}</MarkdownBody></Section>
      <Section title="How would you explain it?"><MarkdownBody>{note.application}</MarkdownBody></Section>

      <PastSessions uid={uid} noteId={note.id} />

      {confirming && (
        <ConfirmDialog
          title="Delete this note?"
          message={`“${note.title}” will be removed from your notes.`}
          confirmLabel="Delete"
          busy={deleting}
          busyLabel="Deleting…"
          error={deleteError}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </article>
  );
}
