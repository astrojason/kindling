import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Note } from "@random-knowledge/shared/notes";
import { dueLabel, dueNotes } from "@random-knowledge/shared/notes-view";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";

/** The notes whose review has come round, each opening straight into its quiz; nothing at all when none are due. */
export function DueNotes({ notes, error, onOpen }: { notes: Note[]; error: string | null; onOpen: (id: string) => void }) {
  const theme = useTheme();
  const due = dueNotes(notes);
  if (error) return <ErrorBox message={error} />;
  if (due.length === 0) return null;

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "800", marginBottom: 8 }}>{due.length} {due.length === 1 ? "note" : "notes"} to recall</Text>
      {due.map((n) => (
        <Pressable key={n.id} accessibilityRole="button" onPress={() => onOpen(n.id)} style={[styles.row, { borderColor: theme.border }]}>
          <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>{n.tag.toUpperCase()}</Text>
          <Text style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "700", marginTop: 2 }}>{n.title}</Text>
          <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 3 }}>{dueLabel(n.next_review_at)} · quiz me</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { borderWidth: 1, borderRadius: radius.sm, padding: 14, marginBottom: 8 } });
