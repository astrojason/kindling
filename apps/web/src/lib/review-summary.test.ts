import { describe, expect, it } from "vitest";
import { reviewSummary } from "@random-knowledge/shared/review-summary";

const base = { dueCards: 0, totalCards: 0, dueNotes: 0, totalNotes: 0 };

describe("reviewSummary", () => {
  it("counts lesson cards and notes together", () => {
    expect(reviewSummary({ ...base, totalCards: 5, dueCards: 2, totalNotes: 8, dueNotes: 3 }).count).toBe(5);
  });

  it("names what is due, with the right singular and plural", () => {
    expect(reviewSummary({ ...base, totalCards: 5, dueCards: 3 }).hint).toBe("3 cards due");
    expect(reviewSummary({ ...base, totalCards: 5, dueCards: 1 }).hint).toBe("1 card due");
    expect(reviewSummary({ ...base, totalNotes: 8, dueNotes: 3 }).hint).toBe("3 notes due");
    expect(reviewSummary({ ...base, totalNotes: 8, dueNotes: 1 }).hint).toBe("1 note due");
    expect(reviewSummary({ ...base, totalCards: 5, dueCards: 2, totalNotes: 8, dueNotes: 3 }).hint).toBe("2 cards and 3 notes due");
  });

  it("says nothing is due when there is something to review but none of it is due", () => {
    expect(reviewSummary({ ...base, totalCards: 5, totalNotes: 8 })).toEqual({ count: 0, hint: "Nothing due right now" });
    expect(reviewSummary({ ...base, totalNotes: 8 }).hint).toBe("Nothing due right now");
  });

  it("invites a first lesson or note when the user has neither cards nor notes", () => {
    expect(reviewSummary(base)).toEqual({ count: 0, hint: "Finish a lesson or capture a note to unlock" });
  });

  it("a note that is due makes the count non-zero even when no card is", () => {
    expect(reviewSummary({ ...base, totalCards: 4, totalNotes: 8, dueNotes: 3 }).count).toBe(3);
  });
});
