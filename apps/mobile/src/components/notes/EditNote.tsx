import { Text, View } from "react-native";
import type { CreateNoteInput, Note } from "@random-knowledge/shared/notes";
import { getUniqueTags } from "@random-knowledge/shared/tags";
import { useNotes } from "../../hooks/useNotes";
import { updateNote } from "../../lib/notes-firestore";
import { useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { NoteForm } from "./NoteForm";

/** Edit an existing note's text, tag and source; its review schedule is untouched. */
export function EditNote({ uid, note, onSaved, onCancel }: { uid: string; note: Note; onSaved: (notice: string) => void; onCancel: () => void }) {
  const theme = useTheme();
  const { notes, error: tagsError } = useNotes(uid);

  async function save(input: CreateNoteInput) {
    await updateNote(uid, note.id, input);
    onSaved("Note updated.");
  }

  return (
    <View>
      <Text style={{ color: theme.fgStrong, fontSize: 22, fontWeight: "800", marginBottom: 16 }}>Edit note</Text>
      {tagsError && <ErrorBox message={`Could not load your existing tags: ${tagsError}`} />}
      <NoteForm initial={note} existingTags={notes ? getUniqueTags(notes) : []} submitLabel="Save changes" onSubmit={save} onCancel={onCancel} />
    </View>
  );
}
