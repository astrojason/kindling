import type { Firestore } from "firebase/firestore";
import { addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";
import type { CreateNoteInput, Note, NoteMessage, NoteSession, NotesStats } from "./notes";
import type { SM2Result } from "./sm2";

export interface NoteSettings {
  articlesAppUid: string | null;
  interestKeywords: string[];
}

/**
 * Notes, quiz sessions, their stats and the Discover settings, all under users/{uid}/…
 * (covered by the owner-only rule on that path). Errors are never swallowed here: callers
 * surface them, and subscriptions require an error handler.
 */
export function createNotesApi(db: Firestore) {
  const notes = (uid: string) => collection(db, "users", uid, "notes");
  const sessions = (uid: string) => collection(db, "users", uid, "sessions");
  const statsRef = (uid: string) => doc(db, "users", uid, "notesMeta", "stats");

  const toNote = (id: string, data: Record<string, unknown>) => ({ id, ...data }) as Note;
  const toSession = (id: string, data: Record<string, unknown>) => ({ id, ...data }) as NoteSession;

  async function createNote(uid: string, input: CreateNoteInput): Promise<string> {
    const nextReview = new Date();
    nextReview.setHours(0, 0, 0, 0);
    nextReview.setDate(nextReview.getDate() + 1);

    const ref = await addDoc(notes(uid), {
      ...input,
      created_at: serverTimestamp(),
      next_review_at: Timestamp.fromDate(nextReview),
      last_reviewed_at: null,
      interval_days: 1,
      easiness_factor: 2.5,
      session_count: 0,
      last_rating: null,
      deleted_at: null,
    });
    return ref.id;
  }

  async function updateNote(uid: string, id: string, input: CreateNoteInput): Promise<void> {
    await updateDoc(doc(db, "users", uid, "notes", id), { ...input });
  }

  /** Soft delete: the UI must ask for confirmation first. The document stays and every query filters it out. */
  async function softDeleteNote(uid: string, id: string): Promise<void> {
    await updateDoc(doc(db, "users", uid, "notes", id), { deleted_at: serverTimestamp() });
  }

  async function getNote(uid: string, id: string): Promise<Note | null> {
    const snap = await getDoc(doc(db, "users", uid, "notes", id));
    return snap.exists() ? toNote(snap.id, snap.data()) : null;
  }

  async function updateNoteAfterRating(uid: string, id: string, sm2: SM2Result, rating: number): Promise<void> {
    await updateDoc(doc(db, "users", uid, "notes", id), {
      interval_days: sm2.intervalDays,
      easiness_factor: sm2.easinessFactor,
      session_count: sm2.sessionCount,
      next_review_at: Timestamp.fromDate(sm2.nextReviewAt),
      last_rating: rating,
      last_reviewed_at: serverTimestamp(),
    });
  }

  function subscribeToNotes(uid: string, onNotes: (notes: Note[]) => void, onError: (err: Error) => void): () => void {
    return onSnapshot(
      query(notes(uid), where("deleted_at", "==", null)),
      (snapshot) => onNotes(snapshot.docs.map((d) => toNote(d.id, d.data()))),
      (err) => onError(err),
    );
  }

  async function getSession(uid: string, id: string): Promise<NoteSession | null> {
    const snap = await getDoc(doc(db, "users", uid, "sessions", id));
    return snap.exists() ? toSession(snap.id, snap.data()) : null;
  }

  async function createSession(uid: string, noteId: string): Promise<string> {
    const ref = await addDoc(sessions(uid), { note_id: noteId, messages: [], completed_at: null, self_rating: null, suggested_rating: null });
    return ref.id;
  }

  async function updateSession(
    uid: string,
    id: string,
    data: { messages?: NoteMessage[]; completed_at?: Date | null; self_rating?: number | null; suggested_rating?: number | null },
  ): Promise<void> {
    await updateDoc(doc(db, "users", uid, "sessions", id), { ...data });
  }

  /** A session without `completed_at` is resumed rather than replaced. */
  async function getIncompleteSession(uid: string, noteId: string): Promise<NoteSession | null> {
    const snap = await getDocs(query(sessions(uid), where("note_id", "==", noteId), where("completed_at", "==", null)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return toSession(d.id, d.data());
  }

  async function getCompletedSessions(uid: string, noteId: string): Promise<NoteSession[]> {
    const snap = await getDocs(query(sessions(uid), where("note_id", "==", noteId)));
    return snap.docs
      .map((d) => toSession(d.id, d.data()))
      .filter((s) => s.completed_at !== null)
      .sort((a, b) => b.completed_at!.toMillis() - a.completed_at!.toMillis());
  }

  async function getNotesStats(uid: string): Promise<NotesStats | null> {
    const snap = await getDoc(statsRef(uid));
    return snap.exists() ? (snap.data() as NotesStats) : null;
  }

  async function incrementNotesStats(uid: string, updates: Partial<NotesStats>): Promise<void> {
    const data: Record<string, ReturnType<typeof increment>> = {};
    if (updates.total_notes) data.total_notes = increment(updates.total_notes);
    if (updates.total_sessions) data.total_sessions = increment(updates.total_sessions);
    if (updates.passing_sessions) data.passing_sessions = increment(updates.passing_sessions);
    await setDoc(statsRef(uid), data, { merge: true });
  }

  async function decrementNoteCount(uid: string): Promise<void> {
    await setDoc(statsRef(uid), { total_notes: increment(-1) }, { merge: true });
  }

  async function getNoteSettings(uid: string): Promise<NoteSettings> {
    const snap = await getDoc(doc(db, "users", uid));
    const data = snap.exists() ? snap.data() : {};
    return { articlesAppUid: (data.articlesAppUid as string | null | undefined) ?? null, interestKeywords: (data.interestKeywords as string[] | undefined) ?? [] };
  }

  /** Merges into users/{uid}, which may not exist yet for a user who has never saved settings. */
  async function updateNoteSettings(uid: string, settings: NoteSettings): Promise<void> {
    await setDoc(doc(db, "users", uid), settings, { merge: true });
  }

  return {
    createNote,
    updateNote,
    softDeleteNote,
    getNote,
    updateNoteAfterRating,
    subscribeToNotes,
    getSession,
    createSession,
    updateSession,
    getIncompleteSession,
    getCompletedSessions,
    getNotesStats,
    incrementNotesStats,
    decrementNoteCount,
    getNoteSettings,
    updateNoteSettings,
  };
}
