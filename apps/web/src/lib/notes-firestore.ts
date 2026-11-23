import { createNotesApi } from "@random-knowledge/shared/notes-firestore";
import { db } from "@/lib/firebase";

export const {
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
} = createNotesApi(db);
