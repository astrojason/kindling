import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { keywordSuggestions } from "@random-knowledge/shared/notes-input";
import { requestJson } from "../../lib/api";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";

const SHOWN = 8;

/** The saved articles account's categories that match the typed keyword, as chips that add one with a tap. */
export function KeywordSuggestions({ savedAccount, getToken, keywords, draft, onPick }: {
  savedAccount: string | null;
  getToken: () => Promise<string>;
  keywords: string[];
  draft: string;
  onPick: (category: string) => void;
}) {
  const theme = useTheme();
  const [loaded, setLoaded] = useState<{ account: string; categories?: string[]; error?: string } | null>(null);

  useEffect(() => {
    if (!savedAccount) return;
    let cancelled = false;
    getToken()
      .then((token) => requestJson("/api/discover/categories", token) as Promise<{ categories: string[] }>)
      .then((data) => {
        if (!cancelled) setLoaded({ account: savedAccount, categories: data.categories });
      })
      .catch((err) => {
        console.error("Failed to load the article categories", err);
        if (!cancelled) setLoaded({ account: savedAccount, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [savedAccount, getToken]);

  const muted = { color: theme.fgMuted, fontSize: 12, marginBottom: 10 };
  if (!savedAccount) return <Text style={muted}>Save your articles account to get category suggestions.</Text>;
  const current = loaded?.account === savedAccount ? loaded : null;
  if (!current) return <Text style={muted}>Loading your categories…</Text>;
  if (current.error) return <ErrorBox message={`Could not load your categories: ${current.error}`} />;

  const matches = keywordSuggestions(current.categories ?? [], keywords, draft).slice(0, SHOWN);
  if (matches.length === 0) return null;
  return (
    <View style={styles.chips}>
      {matches.map((c) => (
        <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Add keyword ${c}`} onPress={() => onPick(c)} style={[styles.chip, { borderColor: theme.border }]}>
          <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "700" }}>+ {c}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
});
