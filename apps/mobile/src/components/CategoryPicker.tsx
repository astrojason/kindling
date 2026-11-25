import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CATEGORIES, CATEGORY_KEYS, matchCategories, type CategoryKey } from "@random-knowledge/shared/categories";
import { radius, useTheme } from "../lib/theme";
import { Button, LinkText } from "./ui";

export function CategoryPicker({
  selectedCategories,
  onSave,
  onCancel,
  editing = Boolean(onCancel),
  compact = false,
  filterable = false,
}: {
  selectedCategories: CategoryKey[];
  onSave: (categories: CategoryKey[]) => Promise<void>;
  onCancel?: () => void;
  /** Changing an existing choice (not the first-run one): different wording and button. Defaults to true when there is a cancel. */
  editing?: boolean;
  /** Sits inside a settings screen: a section-sized heading and no divider under it. */
  compact?: boolean;
  /** A filter box above the list; Select all / Clear all then act on the categories it shows. */
  filterable?: boolean;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState(selectedCategories);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const shown = matchCategories(filter);
  const filtering = shown.length !== CATEGORY_KEYS.length;

  function toggle(key: CategoryKey) {
    setSelected((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  }

  async function save() {
    if (saving || !selected.length) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your categories. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={compact ? undefined : [styles.container, { borderColor: theme.border }]}>
      <Text style={[styles.title, compact && styles.compactTitle, { color: theme.fgStrong }]}>What would you like to learn?</Text>
      <Text style={{ color: theme.fgMuted, fontSize: 13, marginTop: 8, marginBottom: 14 }}>
        Choose at least one category.{" "}
        {editing ? "Changes apply to future lessons; today’s lesson stays the same." : "Your daily lessons will come from your selections. You can change them anytime."}
      </Text>
      {filterable && (
        <TextInput
          accessibilityLabel="Filter categories"
          value={filter}
          onChangeText={setFilter}
          placeholder="Filter categories…"
          placeholderTextColor={theme.fgMuted}
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={[styles.filter, { color: theme.fg, borderColor: theme.border, backgroundColor: theme.bg }]}
        />
      )}
      <View style={styles.linkRow}>
        <LinkText title={filtering ? "Select shown" : "Select all"} onPress={() => setSelected((current) => CATEGORY_KEYS.filter((k) => current.includes(k) || shown.includes(k)))} />
        <LinkText title={filtering ? "Clear shown" : "Clear all"} onPress={() => setSelected((current) => current.filter((k) => !shown.includes(k)))} />
      </View>
      {filtering && !shown.length && <Text style={{ color: theme.fgMuted, fontSize: 13, marginBottom: 8 }}>No category matches “{filter.trim()}”.</Text>}
      {shown.map((key) => {
        const isSelected = selected.includes(key);
        return (
          <Pressable
            key={key}
            onPress={() => toggle(key)}
            style={[
              styles.row,
              { borderColor: isSelected ? theme.accent : theme.border, backgroundColor: isSelected ? theme.accentSoft : "transparent" },
            ]}
          >
            <View style={[styles.checkbox, { borderColor: isSelected ? theme.accent : theme.fgMuted, backgroundColor: isSelected ? theme.accent : "transparent" }]}>
              {isSelected && <Text style={{ color: theme.accentFg, fontSize: 11, fontWeight: "700" }}>{"✓"}</Text>}
            </View>
            <Text style={{ color: isSelected ? theme.accent : theme.fgMuted, fontSize: 14, flex: 1 }}>{CATEGORIES[key]}</Text>
          </Pressable>
        );
      })}
      <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 8 }}>
        {selected.length ? `${selected.length} of ${CATEGORY_KEYS.length} selected` : "Choose at least one category to continue."}
      </Text>
      {error && <Text style={{ color: theme.rust, fontSize: 14, marginTop: 8 }}>{error}</Text>}
      <View style={styles.actions}>
        <Button title={saving ? "Saving…" : editing ? "Save categories" : "Start learning"} onPress={save} disabled={saving || !selected.length} />
        {onCancel && (
          <View style={{ marginTop: 10 }}>
            <LinkText title="Cancel" onPress={onCancel} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, paddingBottom: 20, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700" },
  compactTitle: { fontSize: 16, fontWeight: "800" },
  filter: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  linkRow: { flexDirection: "row", gap: 16, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radius.sm, borderWidth: 1, padding: 12, marginBottom: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  actions: { marginTop: 12 },
});
