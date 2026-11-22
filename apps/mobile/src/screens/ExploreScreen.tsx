import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CATEGORIES } from "@random-knowledge/shared/categories";
import { formatDateLabel } from "@random-knowledge/shared/date";
import type { DailyProgress, HistoryEntry, Lesson } from "@random-knowledge/shared/types";
import { ErrorBox } from "../components/ErrorBox";
import { LessonBody } from "../components/LessonBody";
import { LoadingView } from "../components/LoadingView";
import { QuizReview } from "../components/QuizReview";
import { Card } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { getHistory, getLesson, getProgress } from "../lib/firestore";
import { useTheme } from "../lib/theme";

type Opened = { entry: HistoryEntry; lesson: Lesson; progress: DailyProgress | null };

/** Past lessons, newest first; tap one to read it again with your quiz answers. */
export function ExploreScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getHistory(user.uid)
      .then((entries) => setHistory([...entries].reverse()))
      .catch((err) => {
        console.error("Failed to load past lessons:", err);
        setError(err instanceof Error ? err.message : "Could not load your past lessons.");
      });
  }, [user]);

  async function open(entry: HistoryEntry) {
    if (!user) return;
    setOpening(entry.date);
    setError(null);
    try {
      const [lesson, progress] = await Promise.all([getLesson(user.uid, entry.date), getProgress(user.uid, entry.date)]);
      if (!lesson) throw new Error("That lesson isn't in your history.");
      setOpened({ entry, lesson, progress });
    } catch (err) {
      console.error("Failed to open a past lesson:", err);
      setError(err instanceof Error ? err.message : "Could not open that lesson.");
    } finally {
      setOpening(null);
    }
  }

  if (opened) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Pressable accessibilityRole="button" onPress={() => setOpened(null)} style={{ marginBottom: 12 }}>
            <Text style={{ color: theme.accent, fontWeight: "800" }}>‹ Explore</Text>
          </Pressable>
          <Text style={{ color: theme.fgMuted, fontSize: 12, marginBottom: 8 }}>{CATEGORIES[opened.entry.category]} · {formatDateLabel(opened.entry.date)}</Text>
          <LessonBody lesson={opened.lesson} />
          {opened.progress?.answers && <QuizReview lesson={opened.lesson} answers={opened.progress.answers} />}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card>
        <Text style={[styles.title, { color: theme.fgStrong }]}>Your past lessons</Text>
        {!history && !error && <LoadingView text="Loading your lessons" />}
        {error && <ErrorBox message={error} />}
        {history?.length === 0 && <Text style={{ color: theme.fgMuted }}>Your lesson history will build up here.</Text>}
        {history?.map((entry) => (
          <Pressable
            key={entry.date}
            accessibilityRole="button"
            disabled={opening !== null}
            onPress={() => void open(entry)}
            style={[styles.row, { backgroundColor: theme.surfaceRaised, opacity: opening !== null && opening !== entry.date ? 0.6 : 1 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "800" }}>{entry.title}</Text>
              <Text style={{ color: theme.fgMuted, fontSize: 12 }}>{formatDateLabel(entry.date)} · {CATEGORIES[entry.category]}</Text>
            </View>
            {opening === entry.date && <Text style={{ color: theme.fgMuted, fontSize: 12 }}>Opening…</Text>}
          </Pressable>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, marginBottom: 8 },
});
