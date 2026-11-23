import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { DiscoverArticle } from "@random-knowledge/shared/discover";
import { requestJson } from "../../lib/api";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { LoadingView } from "../LoadingView";
import { Button, LinkText } from "../ui";
import { ArticleCard } from "./ArticleCard";

type Feed = { articles: DiscoverArticle[]; categories: string[] };

/** Unread articles from the user's library that match their keywords, with search and category filters. */
export function DiscoverFeed({ uid, getToken, onBack, onSaved }: { uid: string; getToken: () => Promise<string>; onBack: () => void; onSaved: (noteId: string, notice: string) => void }) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ key: string; feed?: Feed; error?: string } | null>(null);

  const params = new URLSearchParams();
  if (applied) params.set("search", applied);
  if (category) params.set("category", category);
  const query = params.toString();
  const key = `${uid}?${query}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const feed = (await requestJson(`/api/discover/feed${query ? `?${query}` : ""}`, await getToken())) as Feed;
        if (cancelled) return;
        setCategories(feed.categories);
        setResult({ key, feed });
      } catch (err) {
        console.error("Failed to load the Discover feed", err);
        if (!cancelled) setResult({ key, error: err instanceof Error ? err.message : String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
    // The token getter is stable for a signed-in user; the feed reloads when the filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = result?.key === key ? result : null;
  const articles = (current?.feed?.articles ?? []).filter((a) => !removed.has(a.id));
  const chip = (active: boolean) => [styles.chip, { backgroundColor: active ? theme.accent : "transparent", borderColor: active ? theme.accent : theme.border }];

  return (
    <View>
      <LinkText title="← Notes" onPress={onBack} />
      <Text style={{ color: theme.fgStrong, fontSize: 24, fontWeight: "800", marginTop: 12 }}>Discover</Text>
      <Text style={{ color: theme.fgMuted, fontSize: 12, marginBottom: 14 }}>Unread articles that match your keywords.</Text>

      <TextInput
        accessibilityLabel="Search articles"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => setApplied(search.trim())}
        returnKeyType="search"
        placeholder="Search…"
        placeholderTextColor={theme.fgMuted}
        autoCapitalize="none"
        style={[styles.search, { color: theme.fg, borderColor: theme.border, backgroundColor: theme.bg }]}
      />
      <View style={{ marginBottom: 10 }}><Button title="Search" variant="secondary" onPress={() => setApplied(search.trim())} /></View>
      {categories.length > 0 && (
        <View style={styles.chips}>
          {["", ...categories].map((c) => (
            <Pressable key={c || "all"} accessibilityRole="button" accessibilityState={{ selected: category === c }} onPress={() => setCategory(c)} style={chip(category === c)}>
              <Text style={{ color: category === c ? theme.accentFg : theme.fgMuted, fontSize: 12, fontWeight: "700" }}>{c || "All categories"}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!current && <LoadingView text="Finding articles" />}
      {current?.error && <ErrorBox message={current.error} />}
      {current?.feed && articles.length === 0 && <Text style={{ color: theme.fgMuted, textAlign: "center", paddingVertical: 24 }}>No unread articles match your keywords right now.</Text>}
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} uid={uid} getToken={getToken} onDone={(id) => setRemoved((prev) => new Set(prev).add(id))} onSaved={onSaved} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
});
