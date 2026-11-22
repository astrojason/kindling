import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { isOrderCorrect, shuffleSeeded } from "@random-knowledge/shared/games";
import { radius, useTheme } from "../../lib/theme";

/** Tap the items in their correct order; a wrong tap resets the order and adds a miss. */
export function OrderGame({ prompt, items, seed, onFinish }: { prompt: string; items: string[]; seed: string; onFinish: (misses: number) => void }) {
  const theme = useTheme();
  const shuffled = useMemo(() => shuffleSeeded(items, seed), [items, seed]);
  const [picked, setPicked] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState(false);

  function pick(item: string) {
    if (items[picked.length] !== item) {
      setMisses(misses + 1);
      setPicked([]);
      setFlash(true);
      return;
    }
    const next = [...picked, item];
    setFlash(false);
    setPicked(next);
    if (isOrderCorrect(next, items)) onFinish(misses);
  }

  return (
    <View>
      <Text style={{ color: theme.fgStrong, fontSize: 18, fontWeight: "800", marginBottom: 4 }}>{prompt}</Text>
      <Text style={{ color: theme.fgMuted, fontSize: 14, marginBottom: 10 }}>Tap the items in the right order, first to last.</Text>
      {shuffled.map((item) => {
        const position = picked.indexOf(item);
        return (
          <Pressable
            key={item}
            disabled={position >= 0}
            onPress={() => pick(item)}
            style={[styles.item, { backgroundColor: position >= 0 ? theme.correct : theme.surfaceRaised, borderColor: position >= 0 ? theme.success : theme.border }]}
          >
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <Text style={{ color: theme.accent, fontSize: 12, fontWeight: "800" }}>{position >= 0 ? position + 1 : ""}</Text>
            </View>
            <Text style={{ color: theme.fgStrong, fontSize: 14, fontWeight: "700", flex: 1 }}>{item}</Text>
          </Pressable>
        );
      })}
      {flash && <Text accessibilityRole="alert" style={{ color: theme.rust, fontSize: 14, fontWeight: "700", marginTop: 6 }}>Not that one — the order reset. Try again.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.sm, borderWidth: 2, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8 },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
