import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CATEGORIES, CATEGORY_KEYS, type CategoryKey } from "@random-knowledge/shared/categories";
import { getSelectedCategories, setSelectedCategories } from "../../lib/firestore";
import { radius, useTheme } from "../../lib/theme";
import { CategoryPicker } from "../CategoryPicker";
import { ErrorBox } from "../ErrorBox";
import { LoadingView } from "../LoadingView";

/**
 * Which categories future lessons are drawn from: a summary on the Profile screen, edited in a sheet
 * with a filter. Someone who has never chosen starts with all of them.
 */
export function CategorySettings({ uid }: { uid: string }) {
  const theme = useTheme();
  const [loaded, setLoaded] = useState<{ categories?: CategoryKey[]; error?: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSelectedCategories(uid)
      .then((categories) => {
        if (!cancelled) setLoaded({ categories: categories ?? CATEGORY_KEYS });
      })
      .catch((err) => {
        console.error("Failed to load the categories", err);
        if (!cancelled) setLoaded({ error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (!loaded) return <LoadingView text="Loading your categories" />;
  if (loaded.error || !loaded.categories) return <ErrorBox message={loaded.error ?? "Could not load your categories."} />;
  const categories = loaded.categories;
  const all = categories.length === CATEGORY_KEYS.length;

  return (
    <View>
      <Text style={{ color: theme.fgStrong, fontSize: 16, fontWeight: "800", marginBottom: 8 }}>Lesson categories</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the category list to change it"
        onPress={() => {
          setSaved(false);
          setEditing(true);
        }}
        style={({ pressed }) => [styles.summary, { backgroundColor: theme.surfaceRaised, opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.fgStrong, fontSize: 14, fontWeight: "700" }}>
            {all ? "All categories" : `${categories.length} of ${CATEGORY_KEYS.length} categories`}
          </Text>
          {!all && (
            <Text numberOfLines={2} style={{ color: theme.fgMuted, fontSize: 13, marginTop: 2 }}>
              {categories.map((key) => CATEGORIES[key]).join(", ")}
            </Text>
          )}
        </View>
        <Text style={{ color: theme.accent, fontSize: 14, fontWeight: "800" }}>Edit</Text>
      </Pressable>
      {saved && <Text accessibilityRole="alert" style={{ color: theme.success, fontSize: 13, fontWeight: "700", marginTop: 8 }}>✓ Categories saved for future lessons.</Text>}

      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(false)}>
        <ScrollView style={{ backgroundColor: theme.surface }} contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <CategoryPicker
            selectedCategories={categories}
            compact
            filterable
            onCancel={() => setEditing(false)}
            onSave={async (next) => {
              await setSelectedCategories(uid, next);
              setLoaded({ categories: next });
              setEditing(false);
              setSaved(true);
            }}
          />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 14 },
  sheet: { padding: 20, paddingBottom: 40 },
});
