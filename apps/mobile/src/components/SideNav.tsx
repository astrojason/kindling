import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useTheme } from "../lib/theme";
import { TABS, type Tab } from "./TabBar";

export const SIDE_NAV_WIDTH = 220;

/** The tablet's navigation: a fixed column on the left in place of the bottom tab bar. */
export function SideNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.nav, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="tablist">
      <Text style={[styles.brand, { color: theme.fgStrong }]}>Kindling</Text>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        const color = selected ? theme.accent : theme.fgMuted;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={[styles.item, { backgroundColor: selected ? theme.accentSoft : "transparent" }]}
          >
            <SymbolView name={tab.icon} size={22} tintColor={color} />
            <Text style={{ color, fontSize: 15, fontWeight: "800" }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { width: SIDE_NAV_WIDTH, borderRightWidth: 1, paddingHorizontal: 12, paddingTop: 24, paddingBottom: 12, gap: 4 },
  brand: { fontSize: 24, fontWeight: "800", paddingHorizontal: 12, paddingBottom: 20 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12 },
});
