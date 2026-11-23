import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { validateNoteInput } from "@random-knowledge/shared/notes-input";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { Button } from "../ui";
import { Field } from "./Field";

/** Create or edit a note. Everything but the source link is required; saving shows progress and any failure in full. */
export function NoteForm({
  initial,
  existingTags = [],
  submitLabel = "Save note",
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CreateNoteInput>;
  existingTags?: string[];
  submitLabel?: string;
  onSubmit: (input: CreateNoteInput) => Promise<void>;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? "");
  const [what, setWhat] = useState(initial?.what_it_said ?? "");
  const [why, setWhy] = useState(initial?.why_it_matters ?? "");
  const [application, setApplication] = useState(initial?.application ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const result = validateNoteInput({ title, tag, source_url: sourceUrl, what_it_said: what, why_it_matters: why, application });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(result.input);
    } catch (err) {
      console.error("Failed to save note", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="Note title…" />
      <Field label="What did it say?" hint="Markdown" value={what} onChangeText={setWhat} multiline />
      <Field label="Why does it matter?" hint="Markdown" value={why} onChangeText={setWhy} multiline />
      <Field label="How would you explain it?" hint="Markdown" value={application} onChangeText={setApplication} multiline />
      {existingTags.length > 0 && (
        <View style={styles.chips}>
          {existingTags.map((t) => (
            <Pressable key={t} accessibilityRole="button" accessibilityState={{ selected: tag === t }} onPress={() => setTag(t)} style={[styles.chip, { backgroundColor: tag === t ? theme.accent : "transparent", borderColor: tag === t ? theme.accent : theme.border }]}>
              <Text style={{ color: tag === t ? theme.accentFg : theme.fgMuted, fontSize: 12, fontWeight: "700" }}>{t}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Field label="Tag" value={tag} onChangeText={setTag} placeholder="Enter a tag…" autoCapitalize="none" />
      <Field label="Source" hint="optional" value={sourceUrl} onChangeText={setSourceUrl} placeholder="https://…" autoCapitalize="none" keyboardType="url" />

      {error && <ErrorBox message={error} />}
      <View style={styles.actions}>
        <Button title={busy ? "Saving…" : submitLabel} onPress={() => void submit()} disabled={busy} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  actions: { gap: 10, marginTop: 16 },
});
