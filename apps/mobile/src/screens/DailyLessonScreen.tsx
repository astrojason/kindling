import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { formatDateLabel } from "@random-knowledge/shared/date";
import { CATEGORIES } from "@random-knowledge/shared/categories";
import { getStreakStatus } from "@random-knowledge/shared/streak";
import { useAuth } from "../lib/auth-context";
import { useIsTablet } from "../lib/layout";
import { useTheme } from "../lib/theme";
import { useDailyLesson } from "../hooks/useDailyLesson";
import { CategoriesSavedModal } from "../components/CategoriesSavedModal";
import { CategoryPicker } from "../components/CategoryPicker";
import { DoneView } from "../components/DoneView";
import { ErrorView } from "../components/ErrorView";
import { HeaderMenu } from "../components/HeaderMenu";
import { LessonView } from "../components/LessonView";
import { LoadingView } from "../components/LoadingView";
import { PreReviewView } from "../components/PreReviewView";
import { QuizView } from "../components/QuizView";
import { StreakStatus } from "../components/StreakStatus";
import { TodayHome } from "../components/TodayHome";
import { Button, Card } from "../components/ui";

export function DailyLessonScreen({ onFlowChange, onOpenReview, onOpenNote, refreshKey }: { onFlowChange: (inFlow: boolean) => void; onOpenReview: () => void; onOpenNote: (id: string) => void; refreshKey: number }) {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const tablet = useIsTablet();
  const state = useDailyLesson(user);
  const { phase, date, lesson, streak, selectedCategories, actions } = state;
  const [editingCategories, setEditingCategories] = useState(false);
  const [categoriesSaved, setCategoriesSaved] = useState(false);
  const [started, setStarted] = useState(false);
  const canEditCategories = ["prereview", "lesson", "quiz", "done"].includes(phase);
  const showCategoryPicker = phase === "categories" || (canEditCategories && editingCategories);
  const showCategoriesSetting = canEditCategories && !editingCategories;
  const streakCount = getStreakStatus(streak, date).count;
  const showHome = !started && !!user && !!lesson && ["prereview", "lesson", "done"].includes(phase);

  const { refreshPlan } = actions;
  useEffect(() => {
    // Coming back to Today: a changed daily goal may call for more lessons.
    if (refreshKey > 0) refreshPlan();
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onFlowChange(started);
  }, [started, onFlowChange]);

  const picker = showCategoryPicker && (
    <CategoryPicker
      selectedCategories={selectedCategories}
      onSave={async (categories) => {
        await actions.saveCategories(categories);
        setEditingCategories(false);
        setCategoriesSaved(true);
      }}
      onCancel={phase === "categories" ? undefined : () => setEditingCategories(false)}
    />
  );

  if (showHome) {
    return (
      <ScrollView contentContainerStyle={tablet && !editingCategories ? styles.bleed : styles.scroll}>
        <CategoriesSavedModal visible={categoriesSaved} categories={selectedCategories} onClose={() => setCategoriesSaved(false)} />
        {editingCategories ? (
          <Card>{picker}</Card>
        ) : (
          <TodayHome
            uid={user.uid}
            date={date}
            plan={state.plan}
            streak={streak}
            refreshKey={refreshKey}
            onStart={() => {
              const next = state.plan.find((item) => item.status === "ready" && !item.done);
              if (next) void actions.openLesson(next.key).then(() => setStarted(true));
            }}
            onOpen={(key) => void actions.openLesson(key).then(() => setStarted(true))}
            onRetry={actions.retryPlan}
            onOpenReview={onOpenReview}
            onOpenNote={onOpenNote}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerActions}>
              {started && phase !== "quiz" && (
                <Text onPress={() => setStarted(false)} style={{ color: theme.accent, fontSize: 14, fontWeight: "800" }}>‹ Today</Text>
              )}
              <HeaderMenu
                showCategoriesSetting={showCategoriesSetting}
                categoryCount={selectedCategories.length}
                onEditCategories={() => {
                  setEditingCategories(true);
                  setCategoriesSaved(false);
                }}
              />
              <View style={styles.dateRow}>
                <Text style={{ color: theme.fgMuted, fontSize: 13 }}>{formatDateLabel(date)}</Text>
                {streakCount > 0 && (
                  <View style={styles.streakBadge} accessibilityLabel={`${streakCount} ${streakCount === 1 ? "day" : "days"} streak`}>
                    <SymbolView name="flame.fill" size={13} tintColor={theme.accent} />
                    <Text style={{ color: theme.accent, fontSize: 12, fontWeight: "600" }}>{streakCount}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text onPress={signOut} style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "500", textDecorationLine: "underline" }}>
              Sign out
            </Text>
          </View>
          {lesson?.category && (
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <Text style={{ color: theme.accent, fontSize: 12, fontWeight: "800" }}>Today’s lesson: {CATEGORIES[lesson.category]}</Text>
            </View>
          )}
        </View>

        <CategoriesSavedModal visible={categoriesSaved} categories={selectedCategories} onClose={() => setCategoriesSaved(false)} />

        {picker}

        <LessonPhase state={state} uid={user?.uid} />

        {(phase === "lesson" || phase === "done") && (
          <View style={styles.streak}>
            <StreakStatus streak={streak} date={date} />
          </View>
        )}

      </Card>
    </ScrollView>
  );
}

function LessonPhase({ state, uid }: { state: ReturnType<typeof useDailyLesson>; uid?: string }) {
  const theme = useTheme();
  const { phase, lessonKey: date, lesson, progress, quiz, preReview, errorMessage, actions } = state;
  if (phase === "loading") return <LoadingView text="Setting things up" />;
  if (phase === "generating") return <LoadingView text="Researching and checking today’s lesson" />;
  if (phase === "error") return <ErrorView message={errorMessage ?? "Unknown error"} onRetry={actions.retry} />;
  if (!lesson) return null;
  if (phase === "prereview") return <PreReviewView lesson={lesson} preReview={preReview} onAnswer={actions.answerPreReview} onSkip={actions.skipPreReview} />;
  if (phase === "lesson") return <LessonView lesson={lesson} date={date} onStartQuiz={actions.startQuiz} />;
  if (phase === "quiz") return <QuizView lesson={lesson} quiz={quiz} onSelect={actions.selectOption} onNext={actions.nextQuestion} />;
  if (phase !== "done" || !progress) return null;
  const next = state.plan.find((item) => item.status === "ready" && !item.done && item.key !== date);
  const waiting = state.plan.some((item) => !item.done && item.key !== date && (item.status === "queued" || item.status === "generating"));
  return (
    <View>
      {(next || waiting) && (
        <View style={{ backgroundColor: theme.accentSoft, borderRadius: 10, padding: 16, marginBottom: 16, alignItems: "center", gap: 10 }}>
          <Text style={{ color: theme.fgStrong, fontSize: 14, fontWeight: "800" }}>{next ? "Keep going with today’s plan" : "Your next lesson is being prepared…"}</Text>
          {next ? <Button title={`Next lesson: ${next.title}`} onPress={() => void actions.openLesson(next.key)} /> : <LoadingView text="Preparing" />}
        </View>
      )}
    <DoneView
      lesson={lesson}
      date={date}
      progress={progress}
      uid={uid}
      earnedXp={state.earnedXp}
      rewardError={state.rewardError}
      onMore={() => actions.adjustWeight(lesson.category, 4)}
      onLess={() => actions.adjustWeight(lesson.category, -4)}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  bleed: { paddingBottom: 24 },
  header: { borderBottomWidth: 1, paddingBottom: 14, marginBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  badge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginTop: 14 },
  streak: { marginTop: 20 },
});
