"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Card } from "@/components/lesson/Card";
import { CategoryPicker } from "@/components/lesson/CategoryPicker";
import { DoneView } from "@/components/lesson/DoneView";
import { ErrorView } from "@/components/lesson/ErrorView";
import { Header } from "@/components/lesson/Header";
import { LessonView } from "@/components/lesson/LessonView";
import { LoadingView } from "@/components/lesson/LoadingView";
import { PreReviewView } from "@/components/lesson/PreReviewView";
import { QuizView } from "@/components/lesson/QuizView";
import { TabBar } from "@/components/nav/TabBar";
import { TodayHome } from "@/components/today/TodayHome";
import { StreakStatus } from "@/components/lesson/StreakStatus";
import { useAuth } from "@/lib/auth-context";
import { isSuperadmin } from "@/lib/auth-guard";
import { getStreakStatus } from "@/lib/streak";
import { useDailyLesson } from "@/lib/useDailyLesson";

export function DailyLesson() {
  const { user, claims, signOut } = useAuth();
  const state = useDailyLesson(user);
  const { phase, date, lesson, streak, selectedCategories, actions } = state;
  const [editingCategories, setEditingCategories] = useState(false);
  const [started, setStarted] = useState(false);
  const toast = useToast();
  const canEditCategories = SETTINGS_PHASES.includes(phase);
  const showHome = !started && !!user && !!lesson && HOME_PHASES.includes(phase);

  const picker = showCategoryPicker(phase, editingCategories) && (
    <CategoryPicker
      key={phase === "categories" ? "initial" : "edit"}
      selectedCategories={selectedCategories}
      onSave={async (categories) => {
        await actions.saveCategories(categories);
        setEditingCategories(false);
        toast("Categories saved for future lessons.");
      }}
      onCancel={phase === "categories" ? undefined : () => setEditingCategories(false)}
    />
  );

  const resetLink = (
    <div className="mt-6 flex justify-between border-t border-border pt-3">
      <button
        type="button"
        onClick={() => {
          if (window.confirm("Reset your streak, history, and topic preferences? This cannot be undone.")) {
            setEditingCategories(false);
            setStarted(false);
            actions.resetAll();
          }
        }}
        className="text-xs text-fg-muted underline"
      >
        Reset my data
      </button>
      <span />
    </div>
  );

  if (showHome) {
    return (
      <>
        <div className="mx-auto w-full max-w-[560px] px-4 pb-28 pt-8">
          {editingCategories ? <Card>{picker}</Card> : (
            <TodayHome
              uid={user.uid} date={date} plan={state.plan} streak={streak}
              categoryCount={selectedCategories.length}
              onStart={() => {
                const next = state.plan.find((item) => item.status === "ready" && !item.done);
                if (next) void actions.openLesson(next.key).then(() => setStarted(true));
              }}
              onOpen={(key) => void actions.openLesson(key).then(() => setStarted(true))}
              onRetry={actions.retryPlan}
              onEditCategories={() => setEditingCategories(true)}
            />
          )}
          {resetLink}
        </div>
        <TabBar />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-10 pt-8">
      <Card>
        <Header
          date={date}
          streakCount={getStreakStatus(streak, date).count}
          category={lesson?.category}
          showAdminLink={isSuperadmin(claims)}
          showCategoriesSetting={canEditCategories && !editingCategories}
          categoryCount={selectedCategories.length}
          onEditCategories={() => {
            setEditingCategories(true);
          }}
          onSignOut={signOut}
          onBack={started && phase !== "quiz" ? () => setStarted(false) : undefined}
        />

        {picker}

        <LessonPhase state={state} uid={user?.uid} />

        {(phase === "lesson" || phase === "done") && (
          <div className="mt-6">
            <StreakStatus streak={streak} date={date} />
          </div>
        )}

        {resetLink}
      </Card>
    </div>
  );
}

const HOME_PHASES: string[] = ["prereview", "lesson", "done"];

function LessonPhase({ state, uid }: { state: ReturnType<typeof useDailyLesson>; uid?: string }) {
  const { phase, errorMessage, actions } = state;
  if (phase === "loading") return <LoadingView text="Setting things up" />;
  if (phase === "generating") return <LoadingView text="Researching and checking today’s lesson" />;
  if (phase === "error") return <ErrorView message={errorMessage ?? "Unknown error"} onRetry={actions.retry} />;
  return <LoadedLesson state={state} uid={uid} />;
}

function LoadedLesson({ state, uid }: { state: ReturnType<typeof useDailyLesson>; uid?: string }) {
  const { phase, lessonKey: date, lesson, progress, quiz, preReview, actions } = state;
  if (!lesson) return null;
  if (phase === "prereview") return <PreReviewView lesson={lesson} preReview={preReview} onAnswer={actions.answerPreReview} onSkip={actions.skipPreReview} />;
  if (phase === "lesson") return <LessonView lesson={lesson} date={date} onStartQuiz={actions.startQuiz} />;
  if (phase === "quiz") return <QuizView lesson={lesson} quiz={quiz} onSelect={actions.selectOption} onNext={actions.nextQuestion} />;
  if (phase !== "done" || !progress) return null;
  const next = state.plan.find((item) => item.status === "ready" && !item.done && item.key !== date);
  const waiting = state.plan.some((item) => !item.done && item.key !== date && (item.status === "queued" || item.status === "generating"));
  return (
    <>
      {(next || waiting) && (
        <div className="mb-4 rounded-md bg-accent-soft p-4 text-center">
          <p className="mb-2 text-sm font-extrabold text-fg-strong">{next ? "Keep going with today’s plan" : "Your next lesson is being prepared…"}</p>
          {next ? (
            <button type="button" onClick={() => void actions.openLesson(next.key)} className="rounded-full bg-accent px-6 py-3 text-sm font-extrabold text-accent-fg">
              Next lesson: {next.title}
            </button>
          ) : (
            <LoadingView text="Preparing" />
          )}
        </div>
      )}
      <DoneView lesson={lesson} date={date} progress={progress} uid={uid} earnedXp={state.earnedXp} rewardError={state.rewardError}
        onMore={() => actions.adjustWeight(lesson.category, 4)}
        onLess={() => actions.adjustWeight(lesson.category, -4)} />
    </>
  );
}

const SETTINGS_PHASES: string[] = ["prereview", "lesson", "quiz", "done"];

function showCategoryPicker(phase: string, editing: boolean): boolean {
  return phase === "categories" || (SETTINGS_PHASES.includes(phase) && editing);
}
