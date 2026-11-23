import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...parts: string[]) => parts.join("/")),
  collection: vi.fn((_db, ...parts: string[]) => parts.join("/")),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn((col, ...constraints) => ({ col, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  serverTimestamp: vi.fn(() => "SERVER_TS"),
  increment: vi.fn((n: number) => ({ __increment: n })),
  Timestamp: { fromDate: vi.fn((d: Date) => ({ __ts: d.toISOString() })) },
}));

import { addDoc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { createNotesApi } from "@random-knowledge/shared/notes-firestore";

const api = createNotesApi({} as Firestore);
const input = { title: "T", tag: "tag", source_url: null, what_it_said: "a", why_it_matters: "b", application: "c" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 22, 15, 30));
});
afterEach(() => vi.useRealTimers());

describe("notes", () => {
  it("creates a note under the user, due tomorrow, with the SM-2 defaults", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "n1" } as never);

    const id = await api.createNote("u1", input);

    expect(id).toBe("n1");
    const [path, data] = vi.mocked(addDoc).mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(path).toBe("users/u1/notes");
    expect(data).toMatchObject({ ...input, created_at: "SERVER_TS", last_reviewed_at: null, interval_days: 1, easiness_factor: 2.5, session_count: 0, last_rating: null, deleted_at: null });
    expect(data.next_review_at).toEqual({ __ts: new Date(2026, 10, 23).toISOString() });
  });

  it("updates only the editable fields", async () => {
    await api.updateNote("u1", "n1", input);
    expect(updateDoc).toHaveBeenCalledWith("users/u1/notes/n1", input);
  });

  it("soft-deletes by stamping deleted_at, never removing the document", async () => {
    await api.softDeleteNote("u1", "n1");
    expect(updateDoc).toHaveBeenCalledWith("users/u1/notes/n1", { deleted_at: "SERVER_TS" });
  });

  it("returns null for a note that does not exist and the data with its id when it does", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as never);
    expect(await api.getNote("u1", "missing")).toBeNull();

    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, id: "n1", data: () => ({ title: "T" }) } as never);
    expect(await api.getNote("u1", "n1")).toEqual({ id: "n1", title: "T" });
  });

  it("stores the SM-2 result and rating after a review", async () => {
    const nextReviewAt = new Date(2026, 10, 29);
    await api.updateNoteAfterRating("u1", "n1", { intervalDays: 6, easinessFactor: 2.6, sessionCount: 2, nextReviewAt }, 4);

    expect(updateDoc).toHaveBeenCalledWith("users/u1/notes/n1", {
      interval_days: 6,
      easiness_factor: 2.6,
      session_count: 2,
      next_review_at: { __ts: nextReviewAt.toISOString() },
      last_rating: 4,
      last_reviewed_at: "SERVER_TS",
    });
  });

  it("subscribes to the user's notes that are not soft-deleted and reports snapshot errors", () => {
    const unsubscribe = vi.fn();
    vi.mocked(onSnapshot).mockReturnValue(unsubscribe as never);
    const onNotes = vi.fn();
    const onError = vi.fn();

    const result = api.subscribeToNotes("u1", onNotes, onError);

    expect(result).toBe(unsubscribe);
    const [q, next, fail] = vi.mocked(onSnapshot).mock.calls[0] as unknown as [{ col: string; constraints: unknown[] }, (s: unknown) => void, (e: Error) => void];
    expect(q.col).toBe("users/u1/notes");
    expect(q.constraints).toEqual([{ field: "deleted_at", op: "==", value: null }]);
    next({ docs: [{ id: "n1", data: () => ({ title: "T" }) }] });
    expect(onNotes).toHaveBeenCalledWith([{ id: "n1", title: "T" }]);
    const err = new Error("denied");
    fail(err);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describe("sessions", () => {
  it("creates an empty incomplete session for a note", async () => {
    vi.mocked(addDoc).mockResolvedValue({ id: "s1" } as never);
    expect(await api.createSession("u1", "n1")).toBe("s1");
    expect(addDoc).toHaveBeenCalledWith("users/u1/sessions", { note_id: "n1", messages: [], completed_at: null, self_rating: null, suggested_rating: null });
  });

  it("updates a session in place", async () => {
    await api.updateSession("u1", "s1", { self_rating: 4 });
    expect(updateDoc).toHaveBeenCalledWith("users/u1/sessions/s1", { self_rating: 4 });
  });

  it("finds the incomplete session for a note, or null", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as never);
    expect(await api.getIncompleteSession("u1", "n1")).toBeNull();

    vi.mocked(getDocs).mockResolvedValueOnce({ empty: false, docs: [{ id: "s1", data: () => ({ note_id: "n1" }) }] } as never);
    expect(await api.getIncompleteSession("u1", "n1")).toEqual({ id: "s1", note_id: "n1" });
    const q = vi.mocked(getDocs).mock.calls[1][0] as unknown as { constraints: unknown[] };
    expect(q.constraints).toEqual([{ field: "note_id", op: "==", value: "n1" }, { field: "completed_at", op: "==", value: null }]);
  });

  it("lists completed sessions newest first and leaves out incomplete ones", async () => {
    const ts = (ms: number) => ({ toMillis: () => ms });
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: "old", data: () => ({ completed_at: ts(1) }) },
        { id: "open", data: () => ({ completed_at: null }) },
        { id: "new", data: () => ({ completed_at: ts(9) }) },
      ],
    } as never);

    expect((await api.getCompletedSessions("u1", "n1")).map((s) => s.id)).toEqual(["new", "old"]);
  });
});

describe("notes stats and settings", () => {
  it("returns null when no stats exist yet", async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
    expect(await api.getNotesStats("u1")).toBeNull();
  });

  it("increments only the counters that changed, merging into the stats doc", async () => {
    await api.incrementNotesStats("u1", { total_sessions: 1, passing_sessions: 0 });
    expect(setDoc).toHaveBeenCalledWith("users/u1/notesMeta/stats", { total_sessions: { __increment: 1 } }, { merge: true });
  });

  it("decrements the note count when a note is deleted", async () => {
    await api.decrementNoteCount("u1");
    expect(setDoc).toHaveBeenCalledWith("users/u1/notesMeta/stats", { total_notes: { __increment: -1 } }, { merge: true });
  });

  it("saves discover settings on the user doc without clobbering other fields", async () => {
    await api.updateNoteSettings("u1", { articlesAppUid: "art", interestKeywords: ["a"] });
    expect(setDoc).toHaveBeenCalledWith("users/u1", { articlesAppUid: "art", interestKeywords: ["a"] }, { merge: true });
  });

  it("reads settings with empty defaults when the user doc has none", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false } as never);
    expect(await api.getNoteSettings("u1")).toEqual({ articlesAppUid: null, interestKeywords: [] });

    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, data: () => ({ articlesAppUid: "art", interestKeywords: ["a"], other: 1 }) } as never);
    expect(await api.getNoteSettings("u1")).toEqual({ articlesAppUid: "art", interestKeywords: ["a"] });
  });
});
