import { useEffect, useState } from "react";
import type { Note } from "@random-knowledge/shared/notes";
import { getNote } from "../lib/notes-firestore";

/** One note, loaded once; a note that was deleted counts as not found. */
export function useNote(uid: string, id: string): { note: Note | null; error: string | null; loading: boolean } {
  const [result, setResult] = useState<{ key: string; note: Note | null; error: string | null } | null>(null);
  const key = `${uid}/${id}`;

  useEffect(() => {
    let cancelled = false;
    getNote(uid, id)
      .then((note) => {
        if (!cancelled) setResult({ key, note: note && !note.deleted_at ? note : null, error: null });
      })
      .catch((err) => {
        console.error(`Failed to load note ${id}`, err);
        if (!cancelled) setResult({ key, note: null, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [uid, id, key]);

  const current = result?.key === key ? result : null;
  return { note: current?.note ?? null, error: current?.error ?? null, loading: !current };
}
