import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LessonDiagram } from "@random-knowledge/shared/types";
import { radius, useTheme } from "../lib/theme";

/** The dark blueprint panel: caps title, red label tags that open a note when tapped, and a key-principles box. */
export function DiagramView({ diagram }: { diagram: LessonDiagram }) {
  const theme = useTheme();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View accessibilityLabel="Diagram" style={[styles.panel, { backgroundColor: theme.blueprint }]}>
      <Text style={[styles.title, { color: theme.blueprintFg }]}>{diagram.title.toUpperCase()}</Text>
      <Text style={[styles.subtitle, { color: theme.blueprintMuted }]}>{diagram.subtitle.toUpperCase()}</Text>
      <View style={[styles.spine, { borderColor: theme.blueprintTag }]}>
        {diagram.labels.map((label, i) => (
          <View key={label.term} style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: theme.blueprintTag }]} />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open === i }}
              onPress={() => setOpen(open === i ? null : i)}
              style={[styles.tag, { backgroundColor: theme.blueprintTag }]}
            >
              <Text style={{ color: theme.blueprintFg, fontSize: 14, fontWeight: "800" }}>{label.term}</Text>
            </Pressable>
            {open === i && (
              <Text style={[styles.note, { backgroundColor: theme.blueprintLine, color: theme.blueprintFg }]}>{label.note}</Text>
            )}
          </View>
        ))}
      </View>
      <View style={[styles.principles, { borderColor: theme.blueprintMuted }]}>
        <Text style={{ color: theme.blueprintFg, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginBottom: 8 }}>KEY PRINCIPLES</Text>
        {diagram.principles.map((principle) => (
          <Text key={principle} style={{ color: theme.blueprintFg, fontSize: 14, lineHeight: 20, marginBottom: 3 }}>• {principle}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.md, padding: 18, marginVertical: 16 },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center", letterSpacing: 0.5 },
  subtitle: { fontSize: 11, fontWeight: "700", textAlign: "center", letterSpacing: 1, marginTop: 4, marginBottom: 18 },
  spine: { borderLeftWidth: 2, paddingLeft: 16, marginBottom: 18 },
  labelRow: { marginBottom: 12 },
  dot: { position: "absolute", left: -23, top: 16, width: 10, height: 10, borderRadius: 5 },
  tag: { borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11 },
  note: { borderRadius: radius.sm, padding: 12, marginTop: 6, fontSize: 14, lineHeight: 20, overflow: "hidden" },
  principles: { borderWidth: 1, borderRadius: radius.sm, padding: 14 },
});
