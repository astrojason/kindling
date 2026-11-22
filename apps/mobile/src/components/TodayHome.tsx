import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { CATEGORIES } from "@random-knowledge/shared/categories";
import { estimateMinutes } from "@random-knowledge/shared/lesson-time";
import { dueCards } from "@random-knowledge/shared/srs";
import { getStreakStatus } from "@random-knowledge/shared/streak";
import type { Lesson, StatsData, StreakData } from "@random-knowledge/shared/types";
import { goalFraction, levelFor, minutesOn, weekDays } from "@random-knowledge/shared/xp";
import { useProgressData } from "../hooks/useProgressData";
import { radius, useTheme } from "../lib/theme";
import { ErrorBox } from "./ErrorBox";
import { GoalRing } from "./GoalRing";
import { LoadingView } from "./LoadingView";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** The Today tab: greeting, streak and points, daily goal, today's lesson, review and shortcuts. */
export function TodayHome({
  uid, date, lesson, done, streak, categoryCount, onStart, onEditCategories, onOpenReview,
}: {
  uid: string;
  date: string;
  lesson: Lesson;
  done: boolean;
  streak: StreakData;
  categoryCount: number;
  onStart: () => void;
  onEditCategories: () => void;
  onOpenReview: () => void;
}) {
  const theme = useTheme();
  const progress = useProgressData(uid);
  const stats = progress.data?.stats;
  const dueCount = progress.data ? dueCards(progress.data.cards, date).length : 0;
  const minutes = estimateMinutes(lesson);

  return (
    <View style={styles.stack}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={[styles.greeting, { color: theme.fgMuted }]}>Ready for today’s spark?</Text>
          <Text style={[styles.appName, { color: theme.fgStrong }]}>Random Knowledge</Text>
        </View>
        <Chip icon="flame.fill" tint={theme.gold} value={getStreakStatus(streak, date).count} label="day streak" />
        <Chip icon="star.fill" tint={theme.accent} value={stats?.xp ?? 0} label={`points, level ${levelFor(stats?.xp ?? 0)}`} />
      </View>

      {progress.loading && <LoadingView text="Loading your progress" />}
      {progress.error && <ErrorBox message={progress.error} />}
      {stats && <GoalCard stats={stats} date={date} />}

      <View style={[styles.hero, { backgroundColor: theme.heroFrom }]}>
        <View style={[styles.heroGlow, { backgroundColor: theme.heroTo }]} />
        <Text style={[styles.heroLabel, { color: theme.heroFg }]}>TODAY’S LESSON</Text>
        <Text style={[styles.heroMeta, { color: theme.heroFg }]}>~{minutes} min · {done ? "1 of 1 done" : "0 of 1 done"}</Text>
        <View style={[styles.lessonRow, { backgroundColor: theme.surface }]}>
          <View style={[styles.lessonIcon, { backgroundColor: theme.accentSoft }]}>
            <SymbolView name="book.fill" size={22} tintColor={theme.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: "700" }}>{CATEGORIES[lesson.category]}</Text>
            <Text numberOfLines={1} style={{ color: theme.fgStrong, fontSize: 16, fontWeight: "800" }}>{lesson.title}</Text>
          </View>
          <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "600" }}>{minutes} min</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onStart} style={[styles.startButton, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.accent, fontSize: 18, fontWeight: "800" }}>{done ? "Review today’s lesson" : "Start today’s lesson"}</Text>
        </Pressable>
      </View>

      {progress.data && (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.dueBadge, { backgroundColor: theme.accentSoft }]}>
            <Text style={{ color: theme.accent, fontSize: 18, fontWeight: "800" }}>{dueCount}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.fgStrong }]}>Review</Text>
            <Text style={{ color: theme.fgMuted, fontSize: 14 }}>
              {progress.data.cards.length === 0 ? "Finish a lesson to unlock" : dueCount === 0 ? "Nothing due right now" : `${dueCount} ${dueCount === 1 ? "card" : "cards"} due`}
            </Text>
          </View>
          {dueCount > 0 ? (
            <Pressable accessibilityRole="button" onPress={onOpenReview} style={[styles.pill, { backgroundColor: theme.accent }]}>
              <Text style={{ color: theme.accentFg, fontWeight: "800" }}>Start</Text>
            </Pressable>
          ) : (
            <View style={[styles.pill, { backgroundColor: theme.accentSoft }]}>
              <Text style={{ color: theme.fgMuted, fontWeight: "800" }}>Done</Text>
            </View>
          )}
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={onEditCategories} style={[styles.card, { backgroundColor: theme.surface }]}>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, { color: theme.fgStrong }]}>My categories ({categoryCount})</Text>
          <Text style={{ color: theme.fgMuted, fontSize: 14 }}>Choose what future lessons are about</Text>
        </View>
        <SymbolView name="chevron.right" size={16} tintColor={theme.fgMuted} />
      </Pressable>
    </View>
  );
}

function Chip({ icon, tint, value, label }: { icon: "flame.fill" | "star.fill"; tint: string; value: number; label: string }) {
  const theme = useTheme();
  return (
    <View accessibilityLabel={`${value} ${label}`} style={[styles.chip, { backgroundColor: theme.surface }]}>
      <SymbolView name={icon} size={14} tintColor={tint} />
      <Text style={{ color: theme.fgStrong, fontSize: 14, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

function GoalCard({ stats, date }: { stats: StatsData; date: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <GoalRing minutes={minutesOn(stats, date)} fraction={goalFraction(stats, date)} />
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, { color: theme.fgStrong }]}>Daily goal</Text>
        <Text style={{ color: theme.fgMuted, fontSize: 14, marginBottom: 10 }}>{minutesOn(stats, date)} of {stats.goalMinutes} minutes today</Text>
        <View style={styles.week}>
          {weekDays(date).map((day, i) => {
            const learned = (stats.seconds[day] ?? 0) > 0;
            const today = day === date;
            return (
              <View
                key={day}
                style={[styles.dayDot, { backgroundColor: learned ? theme.accent : theme.accentSoft, borderColor: today && !learned ? theme.accent : "transparent" }]}
              >
                <Text style={{ color: learned ? theme.accentFg : today ? theme.accent : theme.fgMuted, fontSize: 11, fontWeight: "800" }}>{WEEKDAY_LETTERS[i]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  greeting: { fontSize: 13, fontWeight: "600" },
  appName: { fontSize: 26, fontWeight: "800" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  card: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: radius.md, padding: 18 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  week: { flexDirection: "row", gap: 5 },
  dayDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  hero: { borderRadius: radius.lg, padding: 20, overflow: "hidden" },
  heroGlow: { position: "absolute", right: -50, bottom: -60, width: 220, height: 220, borderRadius: 110, opacity: 0.55 },
  heroLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1, opacity: 0.85 },
  heroMeta: { fontSize: 14, marginTop: 4, marginBottom: 16, opacity: 0.9 },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.md, padding: 12, marginBottom: 16 },
  lessonIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  startButton: { borderRadius: radius.md, paddingVertical: 16, alignItems: "center" },
  dueBadge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  pill: { borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 10 },
});
