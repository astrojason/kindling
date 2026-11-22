import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/theme";

const TICKS = 36;
const SIZE = 96;
const TICK_LENGTH = 12;
const TICK_WIDTH = 5;

/** The daily-goal ring, drawn as a circle of ticks that fill purple as minutes accumulate (no extra native graphics library needed). */
export function GoalRing({ minutes, fraction }: { minutes: number; fraction: number }) {
  const theme = useTheme();
  const filled = Math.round(fraction * TICKS);
  return (
    <View style={styles.ring} accessibilityLabel={`${minutes} minutes today`}>
      {Array.from({ length: TICKS }, (_, i) => (
        <View key={i} style={[styles.tickSlot, { transform: [{ rotate: `${(360 / TICKS) * i}deg` }] }]}>
          <View style={[styles.tick, { backgroundColor: i < filled ? theme.accent : theme.accentSoft }]} />
        </View>
      ))}
      <Text style={[styles.minutes, { color: theme.fgStrong }]}>{minutes}</Text>
      <Text style={[styles.unit, { color: theme.fgMuted }]}>min</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  tickSlot: { position: "absolute", width: SIZE, height: SIZE, alignItems: "center" },
  tick: { width: TICK_WIDTH, height: TICK_LENGTH, borderRadius: TICK_WIDTH / 2 },
  minutes: { fontSize: 24, fontWeight: "800", lineHeight: 26 },
  unit: { fontSize: 12, fontWeight: "600" },
});
