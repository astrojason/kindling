"use client";

import { LoadingView } from "@/components/lesson/LoadingView";
import { useNotes } from "@/lib/useNotes";
import { NotesLibrary } from "./NotesLibrary";

/** The signed-in user's live notes: a spinner until the first snapshot, and any failure shown in full. */
export function NotesPage({ uid }: { uid: string }) {
  const { notes, error } = useNotes(uid);
  if (notes === null && !error) return <LoadingView text="Loading notes" />;
  return <NotesLibrary notes={notes ?? []} error={error} />;
}
