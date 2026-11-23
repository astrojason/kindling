import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { focalIndex, tokenize } from "@random-knowledge/shared/rsvp";
import { radius, useTheme } from "../../lib/theme";

const DEFAULT_WPM = 300;
const MIN_WPM = 100;
const MAX_WPM = 1000;
const WPM_STEP = 25;

/** Full-screen RSVP reader: one word at a time with the focal letter highlighted. */
export function SpeedReader({ text, onClose }: { text: string; onClose: () => void }) {
  const theme = useTheme();
  const words = useMemo(() => tokenize(text), [text]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState(DEFAULT_WPM);
  const last = words.length - 1;
  // Reaching the last word stops playback without an effect having to switch `playing` off.
  const isPlaying = playing && index < last;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), 60_000 / wpm);
    return () => clearTimeout(timer);
  }, [isPlaying, index, wpm]);

  function togglePlay() {
    if (words.length === 0) return;
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    if (index >= last) setIndex(0);
    setPlaying(true);
  }

  const word = words[index] ?? "";
  const focal = focalIndex(word);
  const progress = last > 0 ? Math.round((index / last) * 100) : words.length ? 100 : 0;
  const control = [styles.control, { borderColor: theme.border }];

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        <View style={styles.top}>
          <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "700" }}>Reading at {wpm} WPM</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12}>
            <Text style={{ color: theme.fgMuted, fontSize: 14, fontWeight: "700" }}>✕ Close</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          {words.length === 0 ? (
            <Text style={{ color: theme.fgMuted }}>Nothing to read.</Text>
          ) : (
            <View style={styles.word} accessibilityLiveRegion="none">
              <Text style={[styles.wordSide, styles.left, { color: theme.fgStrong }]}>{word.slice(0, focal)}</Text>
              <Text style={[styles.wordSide, { color: theme.accent }]}>{word[focal]}</Text>
              <Text style={[styles.wordSide, styles.right, { color: theme.fgStrong }]}>{word.slice(focal + 1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.bottom}>
          <View style={[styles.track, { backgroundColor: theme.border }]}>
            <View style={{ height: 3, width: `${progress}%`, backgroundColor: theme.accent }} />
          </View>
          <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 6 }}>{progress}%</Text>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Restart" onPress={() => { setIndex(0); setPlaying(false); }} style={control}>
              <Text style={{ color: theme.fgMuted }}>⏮</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? "Pause" : "Play"} onPress={togglePlay} style={[styles.control, styles.play, { borderColor: theme.accent }]}>
              <Text style={{ color: theme.accent, fontWeight: "800" }}>{isPlaying ? "❚❚ Pause" : "▶ Play"}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Slower" onPress={() => setWpm((w) => Math.max(MIN_WPM, w - WPM_STEP))} style={control}>
              <Text style={{ color: theme.fgMuted }}>−</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Faster" onPress={() => setWpm((w) => Math.min(MAX_WPM, w + WPM_STEP))} style={control}>
              <Text style={{ color: theme.fgMuted }}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  word: { flexDirection: "row", alignItems: "center", width: "100%" },
  wordSide: { fontSize: 38, lineHeight: 44, flex: 0 },
  left: { flex: 1, textAlign: "right" },
  right: { flex: 1, textAlign: "left" },
  bottom: {},
  track: { height: 3, width: "100%" },
  controls: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  control: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  play: { flex: 1 },
});
