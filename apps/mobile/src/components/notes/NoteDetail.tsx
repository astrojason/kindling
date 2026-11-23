import { useEffect, useState, type ReactNode } from "react";
import { Alert, AppState, Linking, StyleSheet, Text, View } from "react-native";
import type { Note } from "@random-knowledge/shared/notes";
import { dueLabel } from "@random-knowledge/shared/notes-view";
import { useStudyTimer } from "../../hooks/useStudyTimer";
import { decrementNoteCount, softDeleteNote } from "../../lib/notes-firestore";
import { useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { Button, LinkText } from "../ui";
import { MarkdownBody } from "./MarkdownBody";
import { PastSessions } from "./PastSessions";
import { SpeedReader } from "./SpeedReader";
import { StrengthBar } from "./StrengthBar";

/** One reading stretch counts at most this long, so a note left open does not count as hours of study. */
const MAX_READING_SECONDS = 10 * 60;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[styles.section, { color: theme.accent }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/** One note: its three fields as Markdown, where it stands in its review schedule, and its actions. */
export function NoteDetail({ uid, note, onBack, onEdit, onQuiz, onDeleted }: { uid: string; note: Note; onBack: () => void; onEdit: () => void; onQuiz?: () => void; onDeleted: (notice: string) => void }) {
  const theme = useTheme();
  const [speedReading, setSpeedReading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { timer, flush } = useStudyTimer(uid, MAX_READING_SECONDS);

  // Time on the note (reading, speed reading) counts toward the learning goal: counted while the app is in the
  // foreground, saved when it goes to the background or the screen is left.
  useEffect(() => {
    if (AppState.currentState === "active") timer.start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        timer.start();
      } else {
        timer.pause();
        void flush();
      }
    });
    return () => {
      subscription.remove();
      timer.pause();
      void flush();
    };
  }, [timer, flush]);

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      await softDeleteNote(uid, note.id);
    } catch (err) {
      console.error("Failed to delete note", err);
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
      return;
    }
    try {
      await decrementNoteCount(uid);
      onDeleted("Note deleted.");
    } catch (err) {
      // The note is gone; only its running count is stale, and that must be said, not hidden.
      console.error("Failed to update the notes count", err);
      onDeleted(`Note deleted, but its count could not be updated: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete this note?", `“${note.title}” will be removed from your notes.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void remove() },
    ]);
  }

  return (
    <View>
      {speedReading && <SpeedReader text={note.what_it_said} onClose={() => setSpeedReading(false)} />}
      <LinkText title="← Notes" onPress={onBack} />
      <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginTop: 14 }}>{note.tag.toUpperCase()}</Text>
      <Text style={[styles.title, { color: theme.fgStrong }]}>{note.title}</Text>
      {note.source_url && (
        <Text numberOfLines={1} style={{ color: theme.accent, fontSize: 12, textDecorationLine: "underline", marginTop: 2 }} onPress={() => Linking.openURL(note.source_url as string).catch((err) => console.error("Could not open the source", err))}>
          {note.source_url}
        </Text>
      )}
      <View style={styles.meta}>
        <Text style={{ color: theme.fgMuted, fontSize: 12 }}>Reviews {note.session_count} · next {dueLabel(note.next_review_at)}</Text>
        {note.last_rating != null && <StrengthBar value={note.last_rating} />}
      </View>

      <View style={styles.actions}>
        {onQuiz && <Button title="Quiz me" onPress={onQuiz} disabled={deleting} />}
        <Button title="Speed read" variant="secondary" onPress={() => setSpeedReading(true)} disabled={deleting} />
        <Button title="Edit" variant="secondary" onPress={onEdit} disabled={deleting} />
        <Button title={deleting ? "Deleting…" : "Delete"} variant="secondary" onPress={confirmDelete} disabled={deleting} />
      </View>
      {error && <ErrorBox message={error} />}

      <Section title="What did it say?"><MarkdownBody>{note.what_it_said}</MarkdownBody></Section>
      <Section title="Why does it matter?"><MarkdownBody>{note.why_it_matters}</MarkdownBody></Section>
      <Section title="How would you explain it?"><MarkdownBody>{note.application}</MarkdownBody></Section>
      <PastSessions uid={uid} noteId={note.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  actions: { gap: 10, marginTop: 16 },
  section: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 6 },
});
