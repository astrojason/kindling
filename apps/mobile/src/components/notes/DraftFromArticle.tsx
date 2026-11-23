import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { requestJson } from "../../lib/api";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { Button } from "../ui";
import { Field } from "./Field";

/** Paste an article and let the AI draft a note from it; the draft is handed back for the user to review and edit. */
export function DraftFromArticle({ getToken, onDraft }: { getToken: () => Promise<string>; onDraft: (draft: Partial<CreateNoteInput>) => void }) {
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    setError(null);
    setBusy(true);
    try {
      const result = await requestJson("/api/notes/draft", await getToken(), { method: "POST", body: JSON.stringify({ title: title.trim(), content: text.trim() }) });
      onDraft({ title: title.trim(), tag: result.tag, what_it_said: result.what_it_said, why_it_matters: result.why_it_matters, application: result.application });
    } catch (err) {
      console.error("Failed to draft a note", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.box, { borderColor: theme.border }]}>
      <Text style={[styles.heading, { color: theme.fgStrong }]}>Draft from an article</Text>
      <Field label="Article title" value={title} onChangeText={setTitle} placeholder="Article title" />
      <Field label="Article text" value={text} onChangeText={setText} placeholder="Paste the article text…" multiline />
      {error && <ErrorBox message={error} />}
      <View style={{ marginTop: 10 }}>
        <Button title={busy ? "Drafting…" : "Draft a note"} onPress={() => void draft()} disabled={busy || !title.trim() || !text.trim()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: radius.sm, padding: 14, marginBottom: 18 },
  heading: { fontSize: 15, fontWeight: "800", marginBottom: 10 },
});
