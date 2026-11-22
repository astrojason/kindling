import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shuffleSeeded } from "@random-knowledge/shared/games";
import type { MatchPair } from "@random-knowledge/shared/types";
import { radius, useTheme } from "../../lib/theme";

/** Match 4 terms to their meanings: pick one of each; a wrong pair flashes and counts as a miss. */
export function PairsGame({ pairs, seed, onFinish }: { pairs: MatchPair[]; seed: string; onFinish: (misses: number) => void }) {
  const theme = useTheme();
  const meanings = useMemo(() => shuffleSeeded(pairs.map((p) => p.meaning), seed), [pairs, seed]);
  const [term, setTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);

  function pickMeaning(meaning: string) {
    if (!term) return;
    const pair = pairs.find((p) => p.term === term)!;
    if (pair.meaning === meaning) {
      const next = [...matched, term];
      setMatched(next);
      setTerm(null);
      setWrong(null);
      if (next.length === pairs.length) onFinish(misses);
    } else {
      setMisses(misses + 1);
      setWrong(meaning);
    }
  }

  function box(state: "done" | "selected" | "wrong" | "idle") {
    const bg = state === "done" ? theme.correct : state === "selected" ? theme.accentSoft : state === "wrong" ? theme.incorrect : theme.surfaceRaised;
    const border = state === "done" ? theme.success : state === "selected" ? theme.accent : state === "wrong" ? theme.rust : theme.border;
    return [styles.box, { backgroundColor: bg, borderColor: border }];
  }

  return (
    <View>
      <Text style={{ color: theme.fgMuted, fontSize: 14, marginBottom: 10 }}>Tap a term, then its meaning.</Text>
      <View style={styles.columns}>
        <View style={styles.column}>
          {pairs.map((p) => {
            const done = matched.includes(p.term);
            return (
              <Pressable key={p.term} disabled={done} onPress={() => { setTerm(p.term); setWrong(null); }} style={box(done ? "done" : term === p.term ? "selected" : "idle")}>
                <Text style={{ color: theme.fgStrong, fontSize: 14, fontWeight: "700" }}>{p.term}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.column}>
          {meanings.map((m) => {
            const done = matched.includes(pairs.find((p) => p.meaning === m)!.term);
            return (
              <Pressable key={m} disabled={done || !term} onPress={() => pickMeaning(m)} style={box(done ? "done" : wrong === m ? "wrong" : "idle")}>
                <Text style={{ color: theme.fg, fontSize: 14 }}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 10 }}>
        {matched.length} of {pairs.length} matched{misses ? ` · ${misses} ${misses === 1 ? "miss" : "misses"}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: "row", gap: 12 },
  column: { flex: 1, gap: 8 },
  box: { borderRadius: radius.sm, borderWidth: 2, paddingVertical: 12, paddingHorizontal: 12 },
});
