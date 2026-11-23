import Link from "next/link";
import type { Note } from "@random-knowledge/shared/notes";
import { dueLabel, dueNotes } from "@random-knowledge/shared/notes-view";

/** The notes whose review has come round, each linking to the note; nothing at all when none are due. */
export function DueNotes({ notes, error, now = new Date() }: { notes: Note[]; error: string | null; now?: Date }) {
  const due = dueNotes(notes, now);
  if (error) return <pre role="alert" className="mb-4 whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>;
  if (due.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-extrabold text-fg-strong">{due.length} {due.length === 1 ? "note" : "notes"} to recall</h2>
      <ul className="space-y-2">
        {due.map((n) => (
          <li key={n.id}>
            <Link href={`/notes/${n.id}`} className="block rounded-sm border border-border px-3.5 py-3 hover:border-accent">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-accent">{n.tag}</span>
              <span className="block text-sm font-semibold text-fg-strong">{n.title}</span>
              <span className="mt-0.5 block text-xs text-fg-muted">{dueLabel(n.next_review_at, now)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
