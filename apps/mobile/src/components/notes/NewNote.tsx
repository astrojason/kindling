import { useState } from "react";
import { Text, View } from "react-native";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { getUniqueTags } from "@random-knowledge/shared/tags";
import { useNotes } from "../../hooks/useNotes";
import { createNote, incrementNotesStats } from "../../lib/notes-firestore";
import { useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { DraftFromArticle } from "./DraftFromArticle";
import { NoteForm } from "./NoteForm";

/** Capture a note by hand, or draft it from an article first; saving counts the note and opens it. */
export function NewNote({ uid, getToken, onSaved, onCancel }: { uid: string; getToken: () => Promise<string>; onSaved: (id: string, notice: string) => void; onCancel: () => void }) {
  const theme = useTheme();
  const { notes, error: tagsError } = useNotes(uid);
  const [draft, setDraft] = useState<{ values: Partial<CreateNoteInput>; version: number } | null>(null);

  async function save(input: CreateNoteInput) {
    const id = await createNote(uid, input);
    try {
      await incrementNotesStats(uid, { total_notes: 1 });
      onSaved(id, "Note saved.");
    } catch (err) {
      // The note itself is saved; only its running count is stale, and that must be said, not hidden.
      console.error("Failed to update the notes count", err);
      onSaved(id, `Note saved, but its count could not be updated: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <View>
      <Text style={{ color: theme.fgStrong, fontSize: 22, fontWeight: "800", marginBottom: 16 }}>Capture a note</Text>
      <DraftFromArticle getToken={getToken} onDraft={(values) => setDraft({ values, version: (draft?.version ?? 0) + 1 })} />
      {tagsError && <ErrorBox message={`Could not load your existing tags: ${tagsError}`} />}
      <NoteForm key={draft?.version ?? 0} initial={draft?.values} existingTags={notes ? getUniqueTags(notes) : []} onSubmit={save} onCancel={onCancel} />
    </View>
  );
}
