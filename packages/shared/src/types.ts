import type { CategoryKey } from "./categories";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedLesson {
  title: string;
  body: string[];
  wikiQuery: string;
  youtubeQuery: string;
  quiz: QuizQuestion[];
  /** Simpler guess-first questions (3 options each) shown before the lesson when the reader turns pre-review on. Absent on older lessons. */
  preQuiz?: QuizQuestion[];
  /** Absent on lessons saved before source-backed generation. */
  sources?: LessonSource[];
  /** One-based source references for each body paragraph. */
  paragraphSources?: number[][];
  /** Labeled diagram of the lesson's idea. Absent on lessons saved before diagrams. */
  diagram?: LessonDiagram;
  /** Data for the mini-games played after the quiz. Absent on lessons saved before games. */
  games?: LessonGames;
  /** Cloned-voice narration of the lesson. Absent if synthesis failed or hasn't run yet. */
  audioUrl?: string;
}

export interface DiagramLabel {
  term: string;
  note: string;
}

/** A blueprint-style concept map: a headline, a subtitle, 4 labeled parts that open a note when tapped, and a few principles. */
export interface LessonDiagram {
  title: string;
  subtitle: string;
  labels: DiagramLabel[];
  principles: string[];
}

export interface MatchPair {
  term: string;
  meaning: string;
}

export interface TrueFalseStatement {
  statement: string;
  isTrue: boolean;
}

export interface LessonGames {
  pairs?: MatchPair[];
  order?: { prompt: string; items: string[] };
  trueFalse?: TrueFalseStatement[];
}

export type GameKind = "pairs" | "order" | "trueFalse";

export type ReviewRating = "again" | "hard" | "good" | "easy";

/** One quiz question scheduled for spaced repetition at users/{uid}/reviewCards/{id}. */
export interface ReviewCard {
  id: string;
  lessonDate: string;
  lessonTitle: string;
  category: CategoryKey;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** Leitner box 0-6; the box sets the interval until the card is due again. */
  box: number;
  /** Local calendar date (YYYY-MM-DD) the card is next due. */
  due: string;
}

/** Points and learning time at users/{uid}/meta/stats. `seconds` is real time spent in lessons and reviews, keyed by local date. */
export interface StatsData {
  xp: number;
  goalMinutes: number;
  seconds: Record<string, number>;
}

export interface LessonSource {
  title: string;
  url: string;
}

export interface Lesson extends GeneratedLesson {
  category: CategoryKey;
}

export interface StreakData {
  streak: number;
  longest: number;
  lastDate: string | null;
}

/** An Expo push token registered by the mobile app, so the server can badge the app icon without it being open. */
export interface PushToken {
  token: string;
  platform: "ios" | "android";
  updatedAt: string;
}

export interface HistoryEntry {
  date: string;
  category: CategoryKey;
  title: string;
}

export interface DailyProgress {
  done: boolean;
  correct: number;
  total: number;
  /** Selected option index per question, in question order. Absent on progress saved before this field existed. */
  answers?: number[];
  /** True once the bonus mini-game for this lesson has been played (and its points awarded). */
  gamePlayed?: boolean;
}

/** One row in the admin-visible log of lesson generations (src/lib/firebase-admin.ts's logGenerationAdmin). */
/** What triggered a generation: the nightly cron ("auto") or the user opening the app ("on-access"). */
export type GenerationSource = "auto" | "on-access";

export interface GenerationLogEntry {
  uid: string;
  title: string;
  createdAt: string;
  /** Absent on entries logged before the source was recorded. */
  source?: GenerationSource;
  /** Which lesson of the day's plan this was (2 and up); absent for the first lesson and older entries. */
  slot?: number;
  /** Set when the generation failed (or was refused); `title` is then "Generation failed". */
  error?: string;
}

/** One user's outcome within a daily-lesson cron run (src/app/api/cron/generate-daily-lesson/route.ts). */
export interface CronRunResult {
  uid: string;
  status: "generated" | "already-had-lesson" | "auto-generation-off" | "failed";
  error?: string;
}

/** One row in the admin-visible log of daily-lesson cron runs (src/lib/firebase-admin.ts's logCronRunAdmin). */
export interface CronRunLogEntry {
  date: string;
  createdAt: string;
  stoppedForTokenLimit: boolean;
  /** Set when the run quit early for a reason other than the token limit, e.g. the token tracker being unreachable. */
  error?: string;
  results: CronRunResult[];
}

/** A public-by-link snapshot of one lesson, stored at shares/{id} so friends can read it without access to the owner's account. */
export interface SharedLesson {
  id: string;
  ownerName: string | null;
  title: string;
  category: CategoryKey;
  createdAt: string;
  lesson: Lesson;
}

/** One entry in Explore's list of lessons generated for other people. `id` is opaque: it never carries their account id. */
export interface ExploreLesson {
  id: string;
  /** The lesson's date, or `date~slot` for a later lesson of that day. */
  key: string;
  title: string;
  category: CategoryKey;
}

/** What a signed-out or not-yet-approved visitor may see of a share: enough to make the invite interesting. */
export interface SharePreview {
  title: string;
  category: CategoryKey;
  ownerName: string | null;
}

/** A shared lesson a reader saved into their own account at users/{uid}/stash/{shareId}. */
export interface StashEntry {
  id: string;
  savedAt: string;
  sharedBy: string | null;
  title: string;
  category: CategoryKey;
  lesson: Lesson;
}
