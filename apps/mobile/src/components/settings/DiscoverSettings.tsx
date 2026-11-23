import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { addKeyword } from "@random-knowledge/shared/notes-input";
import { getNoteSettings, updateNoteSettings } from "../../lib/notes-firestore";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { LoadingView } from "../LoadingView";
import { Field } from "../notes/Field";
import { Button } from "../ui";

type Settings = { articlesAppUid: string | null; interestKeywords: string[] };

/** Which articles account Discover reads, and the keywords that pick which unread articles to suggest. */
export function DiscoverSettings({ uid }: { uid: string }) {
  const [loaded, setLoaded] = useState<{ settings?: Settings; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNoteSettings(uid)
      .then((settings) => {
        if (!cancelled) setLoaded({ settings });
      })
      .catch((err) => {
        console.error("Failed to load the Discover settings", err);
        if (!cancelled) setLoaded({ error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (!loaded) return <LoadingView text="Loading Discover settings" />;
  if (loaded.error || !loaded.settings) return <ErrorBox message={loaded.error ?? "Could not load the Discover settings."} />;
  return <DiscoverForm uid={uid} initial={loaded.settings} />;
}

function DiscoverForm({ uid, initial }: { uid: string; initial: Settings }) {
  const theme = useTheme();
  const [articlesAppUid, setArticlesAppUid] = useState(initial.articlesAppUid ?? "");
  const [keywords, setKeywords] = useState(initial.interestKeywords);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function add() {
    setKeywords(addKeyword(keywords, draft));
    setDraft("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateNoteSettings(uid, { articlesAppUid: articlesAppUid.trim() || null, interestKeywords: keywords });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save the Discover settings", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Text style={{ color: theme.fgStrong, fontSize: 16, fontWeight: "800", marginBottom: 4 }}>Discover</Text>
      <Text style={{ color: theme.fgMuted, fontSize: 12, marginBottom: 12 }}>Suggests unread articles from your articles library that match your keywords, ready to turn into notes.</Text>
      <Field label="Articles account" value={articlesAppUid} onChangeText={setArticlesAppUid} placeholder="Your uid in the articles app" autoCapitalize="none" autoCorrect={false} />
      <Text style={[styles.label, { color: theme.accent }]}>INTEREST KEYWORDS</Text>
      <View style={styles.chips}>
        {keywords.map((k) => (
          <View key={k} style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: "700" }}>{k}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove keyword ${k}`} onPress={() => setKeywords(keywords.filter((x) => x !== k))} hitSlop={8}>
              <Text style={{ color: theme.fgMuted, fontSize: 12 }}>✕</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Field label="Add a keyword" value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done" autoCapitalize="none" />
      <View style={{ gap: 10 }}>
        <Button title="Add" variant="secondary" onPress={add} />
        <Button title={saving ? "Saving…" : "Save"} onPress={() => void save()} disabled={saving} />
      </View>
      {saved && <Text accessibilityRole="alert" style={{ color: theme.success, fontSize: 13, fontWeight: "700", marginTop: 8 }}>Discover settings saved.</Text>}
      {error && <ErrorBox message={error} />}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
});
