import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useTheme } from "../lib/theme";

export type Tab = "today" | "explore" | "notes" | "review" | "profile";

export const TABS: { key: Tab; label: string; icon: SFSymbol }[] = [
  { key: "today", label: "Today", icon: "sun.max.fill" },
  { key: "explore", label: "Explore", icon: "safari" },
  { key: "notes", label: "Notes", icon: "note.text" },
  { key: "review", label: "Review", icon: "rectangle.stack" },
  { key: "profile", label: "Profile", icon: "person.fill" },
];

/** The bottom tab bar shown on every signed-in screen outside a lesson. */
export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.key === active;
        const color = selected ? theme.accent : theme.fgMuted;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            <SymbolView name={tab.icon} size={24} tintColor={color} />
            <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 1, paddingTop: 8, paddingBottom: 4 },
  tab: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 },
});
