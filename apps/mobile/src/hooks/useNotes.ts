import { useEffect, useState } from "react";
import type { Note } from "@random-knowledge/shared/notes";
import { subscribeToNotes } from "../lib/notes-firestore";

/** The user's live notes: `notes` is null until the first snapshot, and a failure is logged and returned in full. */
export function useNotes(uid: string): { notes: Note[] | null; error: string | null } {
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

  return { notes, error };
}
