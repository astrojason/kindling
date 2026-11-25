import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { radius, useTheme } from "../lib/theme";
import { TABS, type Tab } from "./TabBar";

export const SIDE_NAV_WIDTH = 76;

/** The tablet's navigation: a fixed column on the left in place of the bottom tab bar. */
export function SideNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.nav, { backgroundColor: theme.surface, borderColor: theme.border }]} accessibilityRole="tablist">
      <SymbolView name="flame.fill" size={26} tintColor={theme.gold} style={styles.brand} />
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
            <Text style={{ color, fontSize: 11, fontWeight: "800" }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { width: SIDE_NAV_WIDTH, borderRightWidth: 1, alignItems: "center", paddingTop: 26, paddingBottom: 20, gap: 6 },
  brand: { width: 26, height: 26, marginBottom: 20 },
  item: { width: 60, alignItems: "center", gap: 3, borderRadius: radius.sm, paddingVertical: 9 },
});
