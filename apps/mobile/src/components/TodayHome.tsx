import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { CATEGORIES } from "@random-knowledge/shared/categories";
import type { PlanItem } from "@random-knowledge/shared/lesson-plan";
import { dueNotes, upcomingNotes } from "@random-knowledge/shared/notes-view";
import { reviewSummary } from "@random-knowledge/shared/review-summary";
import { dueCards } from "@random-knowledge/shared/srs";
import { getStreakStatus } from "@random-knowledge/shared/streak";
import type { StatsData, StreakData } from "@random-knowledge/shared/types";
import { goalFraction, levelFor, minutesOn, weekDays } from "@random-knowledge/shared/xp";
import { useProgressData } from "../hooks/useProgressData";
import { useIsTablet } from "../lib/layout";
import { radius, useTheme } from "../lib/theme";
import { ErrorBox } from "./ErrorBox";
import { TabletToday } from "./TabletToday";
import { DueNotes } from "./notes/DueNotes";
import { GoalRing } from "./GoalRing";
import { LoadingView } from "./LoadingView";
import { useAppBadge } from "../hooks/useAppBadge";
import { useNotes } from "../hooks/useNotes";

function rowStatus(item: PlanItem): string {
  if (item.status === "ready") return item.done ? "Done" : `${item.minutes} min`;
  if (item.status === "error") return "Failed";
  return item.status === "generating" ? "Preparing…" : "Queued";
}

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** The Today tab: greeting, streak and points, daily goal, today's lesson, review and shortcuts. */
export function TodayHome({
  uid, date, plan, streak, refreshKey, onStart, onOpen, onRetry, onOpenReview, onOpenNote,
}: {
  uid: string;
  date: string;
  plan: PlanItem[];
  streak: StreakData;
  /** Changes whenever the tab is shown again, so goal and points edited elsewhere are re-read. */
  refreshKey: number;
  onStart: () => void;
  onOpen: (key: string) => void;
  onRetry: () => void;
  onOpenReview: () => void;
  onOpenNote: (id: string) => void;
}) {
  const theme = useTheme();
  const tablet = useIsTablet();
  const progress = useProgressData(uid, refreshKey);
  const stats = progress.data?.stats;
  const { notes, error: notesError } = useNotes(uid);
  const review = progress.data ? reviewSummary({ dueCards: dueCards(progress.data.cards, date).length, totalCards: progress.data.cards.length, dueNotes: notes ? dueNotes(notes).length : 0, totalNotes: notes?.length ?? 0 }) : null;
  const dueCount = review?.count ?? 0;
  const doneCount = plan.filter((item) => item.done).length;
  const totalMinutes = plan.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
  const next = plan.find((item) => item.status === "ready" && !item.done);
  useAppBadge(uid, date, notes ? dueNotes(notes).length : null, !!next);
  const failed = plan.some((item) => item.status === "error");
  const preparing = plan.some((item) => item.status === "queued" || item.status === "generating");

  if (tablet) {
    const now = new Date();
    return (
      <TabletToday
        date={date} plan={plan} streakCount={getStreakStatus(streak, date).count} stats={stats ?? null}
        reviewCount={progress.data && (notes || notesError) ? dueCount : null} reviewHint={review?.hint ?? ""}
        due={notes ? dueNotes(notes, now) : []} upcoming={notes ? upcomingNotes(notes, now).slice(0, 8) : []}
        notesError={notesError} onStart={onStart} onOpen={onOpen} onRetry={onRetry} onOpenReview={onOpenReview} onOpenNote={onOpenNote}
      />
    );
  }

  return (
    <View style={styles.stack}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={[styles.greeting, { color: theme.fgMuted }]}>Ready for today’s spark?</Text>
          <Text style={[styles.appName, { color: theme.fgStrong }]}>Kindling</Text>
        </View>
        <Chip icon="flame.fill" tint={theme.gold} value={getStreakStatus(streak, date).count} label="day streak" />
        <Chip icon="star.fill" tint={theme.accent} value={stats?.xp ?? 0} label={`points, level ${levelFor(stats?.xp ?? 0)}`} />
      </View>

      {progress.loading && <LoadingView text="Loading your progress" />}
      {progress.error && <ErrorBox message={progress.error} />}
      <View style={tablet ? styles.columns : styles.stack}>
      <View style={tablet ? styles.column : styles.stack}>
      {stats && <GoalCard stats={stats} date={date} />}

      <View style={[styles.hero, { backgroundColor: theme.heroFrom }]}>
        <View style={[styles.heroGlow, { backgroundColor: theme.heroTo }]} />
        <Text style={[styles.heroLabel, { color: theme.heroFg }]}>TODAY’S PLAN</Text>
        <Text style={[styles.heroMeta, { color: theme.heroFg }]}>
          ~{totalMinutes} min · {plan.length} {plan.length === 1 ? "lesson" : "lessons"} · {doneCount} of {plan.length} done
        </Text>
        {plan.map((item) => (
          <View key={item.key} style={styles.planItem}>
            <Pressable
              accessibilityRole="button"
              disabled={item.status !== "ready"}
              onPress={() => onOpen(item.key)}
              style={[styles.lessonRow, { backgroundColor: theme.surface, opacity: item.done ? 0.75 : 1 }]}
            >
              <View style={[styles.lessonIcon, { backgroundColor: theme.accentSoft }]}>
                <Text style={{ color: theme.accent, fontSize: 15, fontWeight: "800" }}>{item.done ? "✓" : item.slot}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: "700" }}>{item.category ? CATEGORIES[item.category] : `Lesson ${item.slot}`}</Text>
                <Text numberOfLines={1} style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "800" }}>
                  {item.title ?? (item.status === "error" ? "Could not prepare this lesson" : "Getting this lesson ready")}
                </Text>
              </View>
              {item.status === "generating" && <ActivityIndicator color={theme.accent} />}
              <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "600" }}>{rowStatus(item)}</Text>
            </Pressable>
            {item.error && <ErrorBox message={item.error} />}
          </View>
        ))}
        {failed && (
          <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.retry, { borderColor: theme.heroFg }]}>
            <Text style={{ color: theme.heroFg, fontWeight: "800" }}>Try preparing the rest again</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={!next}
          onPress={onStart}
          style={[styles.startButton, { backgroundColor: theme.surface, opacity: next || preparing ? 1 : 0.8 }]}
        >
          <Text style={{ color: theme.accent, fontSize: 18, fontWeight: "800" }}>
            {next ? (doneCount > 0 ? "Continue today’s plan" : "Start today’s plan") : preparing ? "Preparing your lessons…" : "Review today’s lessons"}
          </Text>
        </Pressable>
      </View>
      </View>

      <View style={tablet ? styles.column : styles.stack}>
      {/* Judge "nothing due" only once the notes have loaded (or failed), so it never flashes while they are still coming. */}
      {progress.data && (notes || notesError) && (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.dueBadge, { backgroundColor: theme.accentSoft }]}>
            <Text style={{ color: theme.accent, fontSize: 18, fontWeight: "800" }}>{dueCount}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.fgStrong }]}>Review</Text>
            <Text style={{ color: theme.fgMuted, fontSize: 14 }}>
              {review?.hint}
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
      <DueNotes notes={notes ?? []} error={notesError ? `Could not load your notes for review: ${notesError}` : null} onOpen={onOpenNote} />
      </View>
      </View>
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
  columns: { flexDirection: "row", alignItems: "flex-start", gap: 20 },
  column: { flex: 1, gap: 16 },
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
  heroMeta: { fontSize: 14, marginTop: 4, marginBottom: 14, opacity: 0.9 },
  planItem: { marginBottom: 8 },
  retry: { borderWidth: 2, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", marginBottom: 12 },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.md, padding: 12 },
  lessonIcon: { width: 44, height: 44, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  startButton: { borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  dueBadge: { width: 48, height: 48, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  pill: { borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 10 },
});
