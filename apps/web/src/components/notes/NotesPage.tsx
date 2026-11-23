"use client";

import { useEffect, useState } from "react";
import type { Note } from "@random-knowledge/shared/notes";
import { LoadingView } from "@/components/lesson/LoadingView";
import { subscribeToNotes } from "@/lib/notes-firestore";
import { NotesLibrary } from "./NotesLibrary";

/** Live-subscribes to the signed-in user's notes: a spinner until the first snapshot, and any failure shown in full. */
export function NotesPage({ uid }: { uid: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeToNotes(uid, setNotes, (err) => {
        console.error("Failed to load notes", err);
        setError(err.message);
      }),
    [uid],
  );

  if (notes === null && !error) return <LoadingView text="Loading notes" />;
  return <NotesLibrary notes={notes ?? []} error={error} />;
}
