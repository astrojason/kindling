import type { User } from "@firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { CATEGORY_KEYS, defaultWeights, pickCategory, type CategoryKey, type Weights } from "@random-knowledge/shared/categories";
import { todayStr } from "@random-knowledge/shared/date";
import { pausedFallbackDate } from "@random-knowledge/shared/paused-generation";
import { advanceQuiz, initialQuizState, selectAnswer } from "@random-knowledge/shared/quiz";
import type { DailyProgress, GeneratedLesson, HistoryEntry, Lesson, StreakData } from "@random-knowledge/shared/types";
import { estimateMinutes } from "@random-knowledge/shared/lesson-time";
import { lessonsNeeded, slotKey, slotOf, type PlanItem } from "@random-knowledge/shared/lesson-plan";
import { goalReached, lessonXp } from "@random-knowledge/shared/xp";
import {
  addReviewCards,
  addStats,
  appendHistory,
  getAccessRequest,
  completeDailyLesson,
  getHistory,
  getLesson,
  getPreReviewEnabled,
  getProgress,
  getSelectedCategories,
  getStats,
  getStreak,
  getWeights,
  setLesson,
  setSelectedCategories,
  setWeights,
} from "../lib/firestore";
import { registerPushToken } from "../lib/pushToken";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const MAX_LESSON_SECONDS = 20 * 60;

type Phase = "loading" | "categories" | "generating" | "error" | "prereview" | "lesson" | "quiz" | "done";

/** Once the daily goal is met no new lesson is prepared: drop the plan entries still waiting and keep those already made. */
function keepReady(items: PlanItem[]): PlanItem[] {
  return items.filter((item) => item.status === "ready");
}

export function useDailyLesson(user: User | null) {
  const busy = useRef(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [date, setDate] = useState(todayStr());
  const [lesson, setLessonState] = useState<Lesson | null>(null);
  const [streak, setStreakState] = useState<StreakData>({ streak: 0, longest: 0, lastDate: null });
  const [weights, setWeightsState] = useState<Weights>(defaultWeights());
  const [selectedCategories, setSelectedCategoriesState] = useState<CategoryKey[]>(CATEGORY_KEYS);
  const [progress, setProgressState] = useState<DailyProgress | null>(null);
  const [quiz, setQuiz] = useState(initialQuizState);
  /** Which guess-first question is showing, when pre-review is on and the lesson has them. */
  const [preReview, setPreReview] = useState({ qIndex: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** Set when the points or review cards for a finished lesson could not be saved; the lesson and streak are already saved. */
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const sessionStart = useRef<number | null>(null);
  /** The lesson being read: today's first lesson, or a later one of today's plan. */
  const [lessonKey, setLessonKey] = useState(todayStr());
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const lessons = useRef(new Map<string, Lesson>());
  const planRun = useRef(0);
  const context = useRef<{ weights: Weights; history: HistoryEntry[]; categories: CategoryKey[]; preReviewOn: boolean; paused: boolean } | null>(null);

  const showLesson = useCallback((currentLesson: Lesson, savedProgress: DailyProgress | null, preReviewOn: boolean) => {
    setLessonState(currentLesson);
    setProgressState(savedProgress);
    setQuiz(initialQuizState);
    setPreReview({ qIndex: 0 });
    // Lessons saved before pre-review existed (or whose questions were dropped) have none to ask, so they open on the lesson.
    const guessFirst = preReviewOn && !!currentLesson.preQuiz?.length;
    setPhase(savedProgress?.done ? "done" : guessFirst ? "prereview" : "lesson");
  }, []);

  const load = useCallback(async () => {
    if (!user || busy.current) return;
    busy.current = true;
    setPhase("loading");
    setErrorMessage(null);
    const today = todayStr();
    setDate(today);

    try {
      const [existingLesson, streakData, weightsData, history, progressData, categoriesData, accessRequest, preReviewOn] = await Promise.all([
        getLesson(user.uid, today),
        getStreak(user.uid),
        getWeights(user.uid),
        getHistory(user.uid),
        getProgress(user.uid, today),
        getSelectedCategories(user.uid),
        getAccessRequest(user.uid),
        getPreReviewEnabled(user.uid),
      ]);
      setStreakState(streakData);
      setWeightsState(weightsData);
      setSelectedCategoriesState(categoriesData ?? CATEGORY_KEYS);
      // With auto generation off, a day without its own lesson shows the last one generated, with the normal quiz and streak.
      const fallbackDate = existingLesson ? null : pausedFallbackDate(accessRequest, history);
      const todaysLesson = existingLesson ?? (fallbackDate ? await getLesson(user.uid, fallbackDate) : null);
      setLessonState(todaysLesson);
      if (!todaysLesson && !categoriesData) {
        setPhase("categories");
        return;
      }

      let currentLesson = todaysLesson;
      if (!currentLesson) {
        setPhase("generating");
        currentLesson = (await createDailyLesson(user, today, weightsData, history, categoriesData ?? CATEGORY_KEYS)).lesson;
      }

      showLesson(currentLesson, progressData, preReviewOn);
      lessons.current = new Map([[today, currentLesson]]);
      setLessonKey(today);
      setPlan([planItem(1, today, currentLesson, !!progressData?.done)]);
      context.current = { weights: weightsData, history: updatedHistory(history, currentLesson, todaysLesson, today), categories: categoriesData ?? CATEGORY_KEYS, preReviewOn, paused: !!fallbackDate };
      void preparePlan(user, today);
    } catch (err) {
      console.error("useDailyLesson load failed:", err);
      setErrorMessage(errorMessageFor(err, "Something went wrong."));
      setPhase("error");
    } finally {
      busy.current = false;
    }
  }, [user, showLesson]);

  useEffect(() => {
    // Intentional: (re)load today's lesson/streak/progress whenever the
    // signed-in user changes. This is a genuine remote-data fetch keyed off
    // `user`, not derived state.
    load();
  }, [load]);

  useEffect(() => {
    if ((phase === "prereview" || phase === "lesson" || phase === "quiz") && sessionStart.current === null) sessionStart.current = Date.now();
  }, [phase]);

  useEffect(() => {
    // Register this device for the badge-only push the daily-lesson cron
    // sends once per user — a no-op if already registered for this session.
    if (user) void registerPushToken(user.uid);
  }, [user]);

  useEffect(() => {
    // Refresh on local midnight or the app returning to the foreground.
    // Let an in-progress quiz finish on its original lesson date before
    // loading the next one.
    const refreshDate = () => {
      if (canRefreshLesson(phase, busy.current) && todayStr() !== date) {
        void load();
      }
    };
    const timer = setInterval(refreshDate, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshDate();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [date, phase, load]);

  function answerPreReview() {
    if (!lesson?.preQuiz) return;
    if (preReview.qIndex + 1 < lesson.preQuiz.length) setPreReview({ qIndex: preReview.qIndex + 1 });
    else setPhase("lesson");
  }

  function skipPreReview() {
    setPhase("lesson");
  }

  function startQuiz() {
    setQuiz(initialQuizState);
    setPhase("quiz");
  }

  function selectOption(index: number) {
    if (!lesson) return;
    setQuiz((q) => selectAnswer(q, index, lesson.quiz[q.qIndex].correctIndex));
  }

  async function nextQuestion() {
    if (!user || !lesson || busy.current) return;
    const advanced = advanceQuiz(quiz, lesson.quiz.length);
    if (advanced !== "complete") {
      setQuiz(advanced);
      return;
    }
    await saveQuizResults(user.uid, lesson);
  }

  async function saveQuizResults(uid: string, completedLesson: Lesson) {
    const finalProgress: DailyProgress = {
      done: true,
      correct: quiz.correct,
      total: completedLesson.quiz.length,
      answers: quiz.answers,
    };
    busy.current = true;
    try {
      const saved = await completeDailyLesson(uid, lessonKey, finalProgress);
      setStreakState(saved.streak);
      setProgressState(saved.progress);
      setPlan((items) => items.map((item) => (item.key === lessonKey ? { ...item, done: true } : item)));
      setPhase("done");
      // Only the save that actually recorded this completion earns points (a second device gets the saved result back instead).
      if (saved.progress === finalProgress) await saveRewards(uid, completedLesson, finalProgress.correct);
    } catch (err) {
      console.error("Failed to save quiz results:", err);
      setErrorMessage(errorMessageFor(err, "Failed to save your results."));
      setPhase("error");
    } finally {
      busy.current = false;
    }
  }

  /** Makes the plan's other lessons for today ready: enough to cover the daily goal, generated one after another in the background. */
  async function preparePlan(u: User, today: string) {
    const ctx = context.current;
    const first = lessons.current.get(today);
    if (!ctx || !first || ctx.paused) return;
    const run = ++planRun.current;
    try {
      const stats = await getStats(u.uid);
      if (goalReached(stats, today)) {
        setPlan(keepReady);
        return;
      }
      const { goalMinutes } = stats;
      const needed = lessonsNeeded(goalMinutes, estimateMinutes(first));
      setPlan((items) => [
        ...items.filter((item) => item.slot <= needed || item.status === "ready"),
        ...Array.from({ length: needed }, (_, i) => i + 1)
          .filter((slot) => !items.some((item) => item.slot === slot))
          .map((slot) => ({ slot, key: slotKey(today, slot), status: "queued" as const, done: false })),
      ].sort((a, b) => a.slot - b.slot));
      for (let slot = 2; slot <= needed; slot++) {
        if (planRun.current !== run) return;
        const key = slotKey(today, slot);
        if (lessons.current.has(key)) continue;
        // The goal may have been met since the last lesson started (by finishing one): then stop making new ones.
        if (goalReached(await getStats(u.uid), today)) {
          setPlan(keepReady);
          return;
        }
        setPlan((items) => items.map((item) => (item.key === key ? { ...item, status: "generating", error: undefined } : item)));
        try {
          let lesson = await getLesson(u.uid, key);
          if (!lesson) {
            const created = await createDailyLesson(u, key, ctx.weights, ctx.history, ctx.categories);
            lesson = created.lesson;
            ctx.history = created.history;
          }
          const done = !!(await getProgress(u.uid, key))?.done;
          const ready = lesson;
          lessons.current.set(key, ready);
          setPlan((items) => items.map((item) => (item.key === key ? planItem(slot, key, ready, done) : item)));
        } catch (err) {
          console.error(`Preparing lesson ${slot} of today's plan failed:`, err);
          setPlan((items) => items.map((item) => (item.key === key ? { ...item, status: "error", error: errorMessageFor(err, "Could not prepare this lesson.") } : item)));
          return;
        }
      }
    } catch (err) {
      console.error("Planning today's lessons failed:", err);
      setPlan((items) => items.map((item) => (item.status === "ready" ? item : { ...item, status: "error", error: errorMessageFor(err, "Could not plan today's lessons.") })));
    }
  }

  /** Re-checks the daily goal and prepares any extra lessons it now calls for (e.g. after raising the goal in Profile). */
  function refreshPlan() {
    if (user && !busy.current) void preparePlan(user, date);
  }

  /** Opens one of today's prepared lessons (its saved result if already finished). */
  async function openLesson(key: string) {
    const next = lessons.current.get(key);
    if (!user || !next || busy.current) return;
    try {
      const savedProgress = await getProgress(user.uid, key);
      sessionStart.current = null;
      setLessonKey(key);
      setErrorMessage(null);
      setRewardError(null);
      setEarnedXp(null);
      showLesson(next, savedProgress, context.current?.preReviewOn ?? false);
    } catch (err) {
      console.error("Failed to open the lesson:", err);
      setErrorMessage(errorMessageFor(err, "Could not open this lesson."));
      setPhase("error");
    }
  }

  /** Points, learning time and review cards for a finished lesson. A failure is shown on the results screen, never swallowed. */
  async function saveRewards(uid: string, completedLesson: Lesson, correct: number) {
    const xp = lessonXp(correct);
    const seconds = Math.min(Math.round((Date.now() - (sessionStart.current ?? Date.now())) / 1000), MAX_LESSON_SECONDS);
    sessionStart.current = null;
    setRewardError(null);
    try {
      await addStats(uid, date, { xp, seconds });
      setEarnedXp(xp);
      await addReviewCards(uid, completedLesson, lessonKey);
    } catch (err) {
      console.error("Failed to save points and review cards:", err);
      setRewardError(errorMessageFor(err, "Your points and review cards could not be saved."));
    }
  }

  async function adjustWeight(category: CategoryKey, delta: number) {
    if (!user) return;
    const next = { ...weights, [category]: Math.min(Math.max((weights[category] || 10) + delta, 2), 40) };
    setWeightsState(next);
    try {
      await setWeights(user.uid, next);
    } catch (err) {
      console.error("Failed to save weight adjustment:", err);
      setErrorMessage(errorMessageFor(err, "Failed to save your preference."));
    }
  }

  async function saveCategories(categories: CategoryKey[]) {
    if (!user) throw new Error("Sign in to save your categories.");
    await setSelectedCategories(user.uid, categories);
    setSelectedCategoriesState(categories);
    if (phase === "categories") await load();
  }

  return {
    phase,
    date,
    lesson,
    streak,
    weights,
    selectedCategories,
    progress,
    quiz,
    preReview,
    errorMessage,
    rewardError,
    earnedXp,
    categoryKeys: CATEGORY_KEYS,
    lessonKey,
    plan,
    actions: { retry: load, openLesson, retryPlan: refreshPlan, refreshPlan, answerPreReview, skipPreReview, startQuiz, selectOption, nextQuestion, adjustWeight, saveCategories },
  };
}

function errorMessageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function canRefreshLesson(phase: Phase, busy: boolean): boolean {
  return AppState.currentState === "active" && phase !== "quiz" && !busy;
}

async function createDailyLesson(user: User, date: string, weights: Weights, history: HistoryEntry[], categories: CategoryKey[]): Promise<{ lesson: Lesson; history: HistoryEntry[] }> {
  if (!API_BASE_URL) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set — see apps/mobile/.env.local.example.");
  const recentCats = history.slice(-2).map((entry) => entry.category);
  const category = pickCategory(weights, recentCats, categories);
  const recentTitles = history.slice(-12).map((entry) => entry.title);
  const idToken = await user.getIdToken();
  const res = await fetch(`${API_BASE_URL}/api/generate-lesson`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ category, recentTitles, ...(slotOf(date) > 1 && { slot: slotOf(date) }) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const lesson: GeneratedLesson & { category: CategoryKey } = await res.json();
  await setLesson(user.uid, date, lesson);
  const nextHistory = await appendHistory(user.uid, { date, category, title: lesson.title }, history);
  return { lesson, history: nextHistory };
}

function planItem(slot: number, key: string, lesson: Lesson, done: boolean): PlanItem {
  return { slot, key, status: "ready", done, title: lesson.title, category: lesson.category, minutes: estimateMinutes(lesson) };
}

/** History as of now: a freshly generated first lesson was just appended to it, a saved one already was. */
function updatedHistory(history: HistoryEntry[], lesson: Lesson, saved: Lesson | null, today: string): HistoryEntry[] {
  if (saved || history.some((entry) => entry.date === today)) return history;
  return [...history, { date: today, category: lesson.category, title: lesson.title }].slice(-60);
}
