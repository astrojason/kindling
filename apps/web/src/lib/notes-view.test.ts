import { describe, expect, it } from "vitest";
import type { Note } from "@random-knowledge/shared/notes";
import { ageLabel, dueLabel, dueNotes, filterNotes, reviewedLabel, sortNotes, upcomingNotes } from "@random-knowledge/shared/notes-view";

const NOW = new Date(2026, 10, 22, 12, 0);
const day = (offset: number) => ({ toDate: () => new Date(2026, 10, 22 + offset, 8, 0) }) as unknown as Note["created_at"];

function note(over: Partial<Note> & { id: string }): Note {
  return {
    title: "Title",
    tag: "tag",
    source_url: null,
    what_it_said: "",
    why_it_matters: "",
    application: "",
    created_at: day(0),
    next_review_at: day(1),
    last_reviewed_at: null,
    interval_days: 1,
    easiness_factor: 2.5,
    session_count: 0,
    last_rating: null,
    deleted_at: null,
    ...over,
  };
}

describe("filterNotes", () => {
  const notes = [note({ id: "a", title: "Black holes", tag: "physics" }), note({ id: "b", title: "Sourdough", tag: "cooking" }), note({ id: "c", title: "Quantum", tag: "physics" })];

  it("keeps everything for the all tag and an empty query", () => {
    expect(filterNotes(notes, { query: "", tag: "all" }).map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("filters by tag", () => {
    expect(filterNotes(notes, { query: "", tag: "physics" }).map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("matches the query against the title or the tag, ignoring case and surrounding spaces", () => {
    expect(filterNotes(notes, { query: "  HOLES ", tag: "all" }).map((n) => n.id)).toEqual(["a"]);
    expect(filterNotes(notes, { query: "cook", tag: "all" }).map((n) => n.id)).toEqual(["b"]);
  });

  it("combines the tag and the query", () => {
    expect(filterNotes(notes, { query: "quant", tag: "physics" }).map((n) => n.id)).toEqual(["c"]);
    expect(filterNotes(notes, { query: "quant", tag: "cooking" })).toEqual([]);
  });
});

describe("sortNotes", () => {
  it("puts the newest first for recent without changing the input", () => {
    const notes = [note({ id: "old", created_at: day(-5) }), note({ id: "new", created_at: day(-1) })];
    expect(sortNotes(notes, "recent").map((n) => n.id)).toEqual(["new", "old"]);
    expect(notes.map((n) => n.id)).toEqual(["old", "new"]);
  });

  it("puts the strongest first for strength, with never-rated notes last", () => {
    const notes = [note({ id: "none" }), note({ id: "weak", last_rating: 2 }), note({ id: "strong", last_rating: 5 })];
    expect(sortNotes(notes, "strength").map((n) => n.id)).toEqual(["strong", "weak", "none"]);
  });

  it("sorts by tag, then title", () => {
    const notes = [note({ id: "1", tag: "b", title: "z" }), note({ id: "2", tag: "a", title: "y" }), note({ id: "3", tag: "a", title: "x" })];
    expect(sortNotes(notes, "tag").map((n) => n.id)).toEqual(["3", "2", "1"]);
  });
});

describe("ageLabel", () => {
  it.each([
    [0, "today"],
    [1, "1d"],
    [6, "6d"],
    [7, "1w"],
    [13, "1w"],
    [14, "2w"],
    [20, "2w"],
    [21, "3w"],
    [27, "3w"],
    [28, "4w"],
    [70, "10w"],
  ])("labels a note from %i days ago as %s", (days, label) => {
    expect(ageLabel(day(-days), NOW)).toBe(label);
  });

  it("says never when nothing has happened yet", () => {
    expect(reviewedLabel(null, NOW)).toBe("never");
    expect(reviewedLabel(day(-3), NOW)).toBe("3d");
  });
});

describe("dueNotes", () => {
  it("returns notes whose next review time has come, earliest first", () => {
    const notes = [
      note({ id: "later", next_review_at: day(2) }),
      note({ id: "overdue", next_review_at: day(-3) }),
      note({ id: "today", next_review_at: day(0) }),
      note({ id: "tomorrow", next_review_at: day(1) }),
    ];
    expect(dueNotes(notes, NOW).map((n) => n.id)).toEqual(["overdue", "today"]);
  });
});

describe("dueLabel", () => {
  it.each([
    [-3, "due now"],
    [0, "due now"],
    [1, "tomorrow"],
    [2, "in 2d"],
    [6, "in 6d"],
    [7, "in 1w"],
    [15, "in 2w"],
  ])("labels a review %i days away as %s", (days, label) => {
    expect(dueLabel(day(days), NOW)).toBe(label);
  });
});

describe("upcomingNotes", () => {
  it("lists the notes not due yet, soonest first, and leaves out the due ones", () => {
    const notes = [note({ id: "late", next_review_at: day(5) }), note({ id: "due", next_review_at: day(-1) }), note({ id: "soon", next_review_at: day(1) })];
    expect(upcomingNotes(notes, NOW).map((n) => n.id)).toEqual(["soon", "late"]);
  });
});
