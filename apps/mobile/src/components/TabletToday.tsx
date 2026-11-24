import { Pressable, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { CATEGORIES } from "@random-knowledge/shared/categories";
import { formatDateLabel } from "@random-knowledge/shared/date";
import type { PlanItem } from "@random-knowledge/shared/lesson-plan";
import type { Note } from "@random-knowledge/shared/notes";
import { dueDateLabel, dueLabel } from "@random-knowledge/shared/notes-view";
import type { StatsData } from "@random-knowledge/shared/types";
import { levelFor, minutesOn, weekDays } from "@random-knowledge/shared/xp";
import { radius, useTheme } from "../lib/theme";
import { ErrorBox } from "./ErrorBox";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function rowStatus(item: PlanItem): string {
  if (item.status === "ready") return item.done ? "Done" : `${item.minutes} min`;
  if (item.status === "error") return "Failed";
  return item.status === "generating" ? "Preparing…" : "Queued";
}

/**
 * The Today screen on a tablet: a header bar, the next lesson as a full-width hero beside the daily goal, today's plan
 * as a strip, and review, notes to recall and what is coming up in three columns (the same layout as the web desktop).
 */
export function TabletToday({
  date, plan, streakCount, stats, reviewCount, reviewHint, due, upcoming, notesError, onStart, onOpen, onRetry, onOpenReview, onOpenNote,
}: {
  date: string;
  plan: PlanItem[];
  streakCount: number;
  stats: StatsData | null;
  reviewCount: number | null;
  reviewHint: string;
  due: Note[];
  upcoming: Note[];
  notesError: string | null;
  onStart: () => void;
  onOpen: (key: string) => void;
  onRetry: () => void;
  onOpenReview: () => void;
  onOpenNote: (id: string) => void;
}) {
  const theme = useTheme();
  const xp = stats?.xp ?? 0;
  const next = plan.find((item) => item.status === "ready" && !item.done);
  const doneCount = plan.filter((item) => item.done).length;
  const failed = plan.some((item) => item.status === "error");
  const preparing = plan.some((item) => item.status === "queued" || item.status === "generating");
  const allDone = !next && !preparing && !failed && plan.length > 0;
  const minutes = stats ? minutesOn(stats, date) : 0;
  const goal = stats?.goalMinutes ?? 0;
  const ctaLabel = next ? (doneCount > 0 ? "Continue today’s plan" : "Start today’s plan") : preparing ? "Preparing your lessons…" : "Review today’s lessons";
  const heroMuted = "rgba(255,255,255,0.8)";

  return (
    <View style={{ backgroundColor: theme.bg }}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.row}>
          <Text style={{ color: theme.fgStrong, fontSize: 20, fontWeight: "900" }}>Kindling</Text>
          <Text style={{ color: theme.fgMuted, fontSize: 14, fontWeight: "700", marginLeft: 12 }}>{formatDateLabel(date)}</Text>
        </View>
        <View style={styles.row}>
          <View accessibilityLabel={`${streakCount} day streak`} style={[styles.row, { gap: 6, marginRight: 20 }]}>
            <SymbolView name="flame.fill" size={15} tintColor={theme.gold} />
            <Text style={{ color: theme.fgStrong, fontSize: 14, fontWeight: "800" }}>{streakCount} day streak</Text>
          </View>
          <View accessibilityLabel={`${xp} points, level ${levelFor(xp)}`} style={[styles.row, { gap: 6 }]}>
            <SymbolView name="star.fill" size={15} tintColor={theme.accent} />
            <Text style={{ color: theme.fgStrong, fontSize: 14, fontWeight: "800" }}>{xp.toLocaleString()} XP · Level {levelFor(xp)}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.hero, { backgroundColor: theme.heroFrom }]}>
        <View style={styles.heroMain}>
          <Text style={{ color: heroMuted, fontSize: 14, fontWeight: "800" }}>Ready for today’s spark?</Text>
          {next && (
            <>
              <Text style={{ color: heroMuted, fontSize: 13, fontWeight: "900", letterSpacing: 1, marginTop: 14 }}>
                {`LESSON ${next.slot} OF ${plan.length}${next.category ? ` · ${CATEGORIES[next.category].toUpperCase()}` : ""}${next.minutes ? ` · ${next.minutes} MIN` : ""}`}
              </Text>
              <Text style={styles.heroTitle}>{next.title}</Text>
            </>
          )}
          {allDone && <Text style={[styles.heroTitle, { fontSize: 32 }]}>You showed up today. Come back tomorrow for another discovery.</Text>}
          <View style={[styles.row, { gap: 12, marginTop: 20 }]}>
            <Pressable accessibilityRole="button" disabled={!next} onPress={onStart} style={[styles.cta, { backgroundColor: "#ffffff", opacity: next || preparing ? 1 : 0.8 }]}>
              <Text style={{ color: theme.heroTo, fontSize: 16, fontWeight: "900" }}>{ctaLabel}</Text>
            </Pressable>
            {failed && (
              <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.cta, { borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" }]}>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "800" }}>Try preparing the rest again</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.goal}>
          <Text style={{ color: heroMuted, fontSize: 12, fontWeight: "900", letterSpacing: 1 }}>DAILY GOAL</Text>
          <View style={[styles.row, { alignItems: "baseline", gap: 6, marginTop: 10 }]}>
            <Text style={{ color: "#ffffff", fontSize: 44, fontWeight: "900" }}>{minutes}</Text>
            <Text style={{ color: heroMuted, fontSize: 15, fontWeight: "700" }}>/ {goal} min today</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${goal ? Math.min(100, (minutes / goal) * 100) : 0}%` }]} />
          </View>
          <View style={[styles.row, { gap: 4 }]}>
            {stats && weekDays(date).map((day, i) => {
              const learned = (stats.seconds[day] ?? 0) > 0;
              return (
                <View key={day} style={[styles.day, { backgroundColor: learned ? "#ffffff" : "rgba(255,255,255,0.14)", borderColor: day === date ? "#ffffff" : "transparent" }]}>
                  <Text style={{ color: learned ? theme.heroTo : heroMuted, fontSize: 12, fontWeight: "900" }}>{WEEKDAY_LETTERS[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={[styles.strip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {plan.map((item) => {
          const isNext = item === next;
          const openable = item.status === "ready" && !item.done;
          return (
            <Pressable key={item.key} accessibilityRole="button" disabled={!openable} onPress={() => onOpen(item.key)} style={[styles.planCell, { borderColor: theme.border, backgroundColor: isNext ? theme.accentSoft : "transparent" }]}>
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "900" }}>0{item.slot} · {item.category ? CATEGORIES[item.category] : `Lesson ${item.slot}`}</Text>
                <Text style={{ color: item.done ? theme.success : item.status === "error" ? theme.rust : isNext ? theme.accent : theme.fgMuted, fontSize: 13, fontWeight: "900" }}>{rowStatus(item)}</Text>
              </View>
              <Text style={{ color: item.done || item.status !== "ready" ? theme.fgMuted : theme.fgStrong, fontSize: 18, fontWeight: "800", marginTop: 6 }}>
                {item.title ?? (item.status === "error" ? "Could not prepare this lesson" : "Getting this lesson ready")}
              </Text>
              {item.error && <Text style={{ color: theme.rust, fontSize: 13, marginTop: 4 }}>{item.error}</Text>}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.columns}>
        <View style={[styles.column, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.fgMuted }]}>REVIEW</Text>
          {reviewCount === null ? <Text style={{ color: theme.fgMuted }}>Loading…</Text> : (
            <View style={[styles.row, { alignItems: "baseline", gap: 10 }]}>
              <Text style={{ color: theme.fgStrong, fontSize: 40, fontWeight: "900" }}>{reviewCount}</Text>
              <Text style={{ color: theme.fgMuted, fontSize: 15, flexShrink: 1 }}>{reviewHint}</Text>
            </View>
          )}
          {reviewCount ? (
            <Pressable accessibilityRole="button" onPress={onOpenReview} style={[styles.reviewButton, { backgroundColor: theme.accent }]}>
              <Text style={{ color: theme.accentFg, fontSize: 14, fontWeight: "800" }}>Start review</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={[styles.column, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.fgMuted }]}>{due.length} {due.length === 1 ? "NOTE" : "NOTES"} TO RECALL</Text>
          {notesError && <ErrorBox message={`Could not load your notes for review: ${notesError}`} />}
          {due.map((n) => <NoteRow key={n.id} note={n} due onOpen={onOpenNote} />)}
        </View>
        <View style={[styles.column, { borderRightWidth: 0 }]}>
          <Text style={[styles.label, { color: theme.fgMuted }]}>COMING UP FOR REVIEW</Text>
          {upcoming.map((n) => <NoteRow key={n.id} note={n} due={false} onOpen={onOpenNote} />)}
        </View>
      </View>
    </View>
  );
}

function NoteRow({ note, due, onOpen }: { note: Note; due: boolean; onOpen: (id: string) => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(note.id)} style={[styles.noteRow, { borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "900", letterSpacing: 0.5 }}>{note.tag.toUpperCase()}</Text>
        <Text numberOfLines={1} style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "700" }}>{note.title}</Text>
      </View>
      <Text style={{ color: due ? theme.rust : theme.fgMuted, fontSize: 12 }}>{(due ? dueLabel : dueDateLabel)(note.next_review_at)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 64, paddingHorizontal: 32, borderBottomWidth: 1 },
  hero: { flexDirection: "row", paddingHorizontal: 32, paddingTop: 36, paddingBottom: 32, gap: 40 },
  heroMain: { flex: 1 },
  heroTitle: { color: "#ffffff", fontSize: 44, fontWeight: "900", lineHeight: 48, marginTop: 8 },
  cta: { borderRadius: radius.sm, paddingVertical: 14, paddingHorizontal: 26 },
  goal: { width: 260, paddingLeft: 28, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.22)", justifyContent: "flex-end", gap: 12 },
  track: { height: 5, backgroundColor: "rgba(255,255,255,0.2)" },
  fill: { height: 5, backgroundColor: "#ffffff" },
  day: { flex: 1, alignItems: "center", paddingVertical: 5, borderRadius: 2, borderWidth: 2 },
  strip: { flexDirection: "row", borderBottomWidth: 1 },
  planCell: { flex: 1, borderRightWidth: 1, paddingHorizontal: 32, paddingTop: 22, paddingBottom: 24 },
  columns: { flexDirection: "row", alignItems: "flex-start" },
  column: { flex: 1, borderRightWidth: 1, paddingHorizontal: 32, paddingVertical: 26, gap: 10 },
  label: { fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },
  reviewButton: { alignSelf: "flex-start", borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 20 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
});
