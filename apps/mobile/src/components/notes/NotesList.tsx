import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Note } from "@random-knowledge/shared/notes";
import { ageLabel, filterNotes, reviewedLabel, sortNotes, type NoteSort } from "@random-knowledge/shared/notes-view";
import { getUniqueTags } from "@random-knowledge/shared/tags";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { Button, LinkText } from "../ui";
import { StrengthBar } from "./StrengthBar";

const SORTS: NoteSort[] = ["recent", "strength", "tag"];

/** The notes archive: search, tag chips and sort over a list that opens each note. */
export function NotesList({ notes, error, notice, onOpen, onCapture, onDiscover }: { notes: Note[]; error: string | null; notice: string | null; onOpen: (id: string) => void; onCapture: () => void; onDiscover: () => void }) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<NoteSort>("recent");
  const now = new Date();

  const tags = useMemo(() => ["all", ...getUniqueTags(notes)], [notes]);
  const visible = useMemo(() => sortNotes(filterNotes(notes, { query, tag }), sort), [notes, query, tag, sort]);

  return (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.fgStrong }]}>Notes</Text>
          <Text style={{ color: theme.fgMuted, fontSize: 12 }}>{visible.length === notes.length ? `${notes.length} notes` : `${visible.length} of ${notes.length}`}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <LinkText title="Discover" onPress={onDiscover} />
          <View style={{ width: 120 }}><Button title="Capture" onPress={onCapture} /></View>
        </View>
      </View>

      {notice && <Text accessibilityRole="alert" style={[styles.notice, { backgroundColor: theme.accentSoft, color: theme.accent }]}>{notice}</Text>}
      {error && <ErrorBox message={error} />}

      {notes.length === 0 && !error ? (
        <Text style={{ color: theme.fgMuted, textAlign: "center", paddingVertical: 28 }}>No notes yet. Capture something you want to remember.</Text>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Search notes"
            value={query}
            onChangeText={setQuery}
            placeholder="Search title or tag…"
            placeholderTextColor={theme.fgMuted}
            autoCapitalize="none"
            style={[styles.search, { color: theme.fg, borderColor: theme.border, backgroundColor: theme.bg }]}
          />
          <View style={styles.sorts}>
            <Text style={{ color: theme.fgMuted, fontSize: 12 }}>Sort</Text>
            {SORTS.map((s) => (
              <Pressable key={s} accessibilityRole="button" accessibilityState={{ selected: sort === s }} onPress={() => setSort(s)} hitSlop={8}>
                <Text style={{ color: sort === s ? theme.accent : theme.fgMuted, fontSize: 12, fontWeight: sort === s ? "800" : "600" }}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.chips}>
            {tags.map((t) => (
              <Pressable key={t} accessibilityRole="button" accessibilityState={{ selected: tag === t }} onPress={() => setTag(t)} style={[styles.chip, { backgroundColor: tag === t ? theme.accent : "transparent", borderColor: tag === t ? theme.accent : theme.border }]}>
                <Text style={{ color: tag === t ? theme.accentFg : theme.fgMuted, fontSize: 12, fontWeight: "700" }}>{t}</Text>
              </Pressable>
            ))}
          </View>

          {visible.length === 0 ? (
            <Text style={{ color: theme.fgMuted, textAlign: "center", paddingVertical: 24 }}>No notes match.</Text>
          ) : (
            visible.map((n) => (
              <Pressable key={n.id} accessibilityRole="button" onPress={() => onOpen(n.id)} style={[styles.row, { borderColor: theme.border }]}>
                <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>{n.tag.toUpperCase()}</Text>
                <Text style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "700", marginTop: 2 }}>{n.title}</Text>
                <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 4 }}>added {ageLabel(n.created_at, now)} · reviewed {reviewedLabel(n.last_reviewed_at, now)}</Text>
                {n.last_rating != null && <View style={{ marginTop: 8 }}><StrengthBar value={n.last_rating} /></View>}
              </Pressable>
            ))
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 },
  title: { fontSize: 24, fontWeight: "800" },
  notice: { borderRadius: radius.sm, padding: 10, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  search: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  sorts: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  row: { borderWidth: 1, borderRadius: radius.sm, padding: 14, marginBottom: 10 },
});
