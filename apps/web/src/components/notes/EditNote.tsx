"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateNoteInput, Note } from "@random-knowledge/shared/notes";
import { getUniqueTags } from "@random-knowledge/shared/tags";
import { useToast } from "@/components/Toast";
import { subscribeToNotes, updateNote } from "@/lib/notes-firestore";
import { NoteForm } from "./NoteForm";

/** Edit an existing note's text, tag and source; its review schedule is untouched. */
export function EditNote({ uid, note }: { uid: string; note: Note }) {
  const router = useRouter();
  const toast = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [tagsError, setTagsError] = useState<string | null>(null);

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
    await updateNote(uid, note.id, input);
    toast("Note updated.");
    router.push(`/notes/${note.id}`);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold text-fg-strong">Edit note</h1>
      {tagsError && <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">Could not load your existing tags: {tagsError}</pre>}
      <NoteForm initial={note} existingTags={tags} submitLabel="Save changes" onSubmit={save} onCancel={() => router.push(`/notes/${note.id}`)} />
    </div>
  );
}
