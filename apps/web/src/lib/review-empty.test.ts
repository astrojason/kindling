import { describe, expect, it } from "vitest";
import { reviewEmptyMessage } from "./review-empty";

describe("reviewEmptyMessage", () => {
  it("says nothing when anything is due", () => {
    expect(reviewEmptyMessage({ totalCards: 5, dueCards: 1, totalNotes: 3, dueNotes: 0 })).toBeNull();
    expect(reviewEmptyMessage({ totalCards: 0, dueCards: 0, totalNotes: 3, dueNotes: 2 })).toBeNull();
  });

  it("invites a first lesson or note when the user has neither cards nor notes", () => {
    expect(reviewEmptyMessage({ totalCards: 0, dueCards: 0, totalNotes: 0, dueNotes: 0 })).toBe("Finish a lesson and its quiz, or capture a note, to unlock reviews.");
  });

  it("says to come back later when there are cards or notes but none are due", () => {
    expect(reviewEmptyMessage({ totalCards: 4, dueCards: 0, totalNotes: 0, dueNotes: 0 })).toBe("Nothing is due right now. Come back later.");
    expect(reviewEmptyMessage({ totalCards: 0, dueCards: 0, totalNotes: 2, dueNotes: 0 })).toBe("Nothing is due right now. Come back later.");
  });
});
