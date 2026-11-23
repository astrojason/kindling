"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { getUniqueTags } from "@random-knowledge/shared/tags";
import { useToast } from "@/components/Toast";
import { createNote, incrementNotesStats, subscribeToNotes } from "@/lib/notes-firestore";
import { DraftFromArticle } from "./DraftFromArticle";
import { NoteForm } from "./NoteForm";

/** Capture a note by hand, or draft it from an article first; saving counts the note and opens it. */
export function NewNote({ uid, getToken }: { uid: string; getToken: () => Promise<string> }) {
  const router = useRouter();
  const toast = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ values: Partial<CreateNoteInput>; version: number } | null>(null);

  useEffect(
    () =>
      subscribeToNotes(
        uid,
        (notes) => setTags(getUniqueTags(notes)),
        (err) => {
          console.error("Failed to load existing tags", err);
          setTagsError(err.message);
        },
      ),
    [uid],
  );

  async function save(input: CreateNoteInput) {
    const id = await createNote(uid, input);
    try {
      await incrementNotesStats(uid, { total_notes: 1 });
      toast("Note saved.");
    } catch (err) {
      // The note itself is saved; only its running count is stale, and that must be said, not hidden.
      console.error("Failed to update the notes count", err);
      toast(`Note saved, but its count could not be updated: ${err instanceof Error ? err.message : String(err)}`);
    }
    router.push(`/notes/${id}`);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold text-fg-strong">Capture a note</h1>
      <DraftFromArticle getToken={getToken} onDraft={(values) => setDraft({ values, version: (draft?.version ?? 0) + 1 })} />
      {tagsError && <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">Could not load your existing tags: {tagsError}</pre>}
      <NoteForm key={draft?.version ?? 0} initial={draft?.values} existingTags={tags} onSubmit={save} onCancel={() => router.back()} />
    </div>
  );
}
