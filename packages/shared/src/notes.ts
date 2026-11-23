import type { Timestamp } from "firebase/firestore";

/** One turn of a quiz-chat session about a note. */
export interface NoteMessage {
  role: "user" | "assistant";
  content: string;
}

/** A captured note with its SM-2 review state, stored at users/{uid}/notes/{id}. */
export interface Note {
  id: string;
  title: string;
  tag: string;
  source_url: string | null;
  what_it_said: string;
  why_it_matters: string;
  application: string;
  created_at: Timestamp;
  next_review_at: Timestamp;
  last_reviewed_at: Timestamp | null;
  interval_days: number;
  easiness_factor: number;
  session_count: number;
  last_rating: number | null;
  /** Soft delete: filter `deleted_at == null` on every notes query. */
  deleted_at: Timestamp | null;
}

/** A quiz-chat session about one note, stored at users/{uid}/sessions/{id}. Incomplete (`completed_at: null`) sessions are resumed. */
export interface NoteSession {
  id: string;
  note_id: string;
  messages: NoteMessage[];
  completed_at: Timestamp | null;
  self_rating: number | null;
  suggested_rating: number | null;
}

/** Running totals at users/{uid}/notesMeta/stats. */
export interface NotesStats {
  total_sessions: number;
  passing_sessions: number;
  total_notes: number;
}

export interface CreateNoteInput {
  title: string;
  tag: string;
  source_url: string | null;
  what_it_said: string;
  why_it_matters: string;
  application: string;
}
