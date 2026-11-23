import { describe, expect, it } from "vitest";
import { parseSessionReply, ratingFromStoredReplies, RATING_LABELS } from "@random-knowledge/shared/session-protocol";

describe("parseSessionReply", () => {
  it("leaves an ordinary question turn alone", () => {
    expect(parseSessionReply("  Why does light bend?  ")).toEqual({ complete: false, rating: undefined, display: "Why does light bend?" });
  });

  it("reads the closing assessment: marks the session complete, takes the rating, hides the markers", () => {
    const reply = parseSessionReply("You grasp the basics but missed lensing.\nRATING:4\nSESSION_COMPLETE");
    expect(reply.complete).toBe(true);
    expect(reply.rating).toBe(4);
    expect(reply.display).toBe("You grasp the basics but missed lensing.\n\nSuggested rating: hot");
    expect(reply.display).not.toMatch(/SESSION_COMPLETE|RATING:/);
  });

  it.each([["RATING:1", "cold"], ["RATING:2", "cool"], ["RATING:3", "warm"], ["RATING:4", "hot"], ["RATING:5", "solid"]])("labels %s as %s", (marker, label) => {
    expect(parseSessionReply(`Verdict.\n${marker}\nSESSION_COMPLETE`).display).toContain(`Suggested rating: ${label}`);
  });

  it("also understands 'Suggested rating: 3'", () => {
    expect(parseSessionReply("Fine.\nSuggested rating: 3\nSESSION_COMPLETE").rating).toBe(3);
  });

  it("ignores a rating outside 1-5", () => {
    expect(parseSessionReply("Hmm.\nRATING:7\nSESSION_COMPLETE").rating).toBeUndefined();
  });

  it("only completes on SESSION_COMPLETE, even if a rating appears", () => {
    expect(parseSessionReply("Halfway.\nRATING:3")).toMatchObject({ complete: false, rating: 3 });
  });

  it("exposes the five labels in order", () => {
    expect(RATING_LABELS).toEqual(["cold", "cool", "warm", "hot", "solid"]);
  });
});

describe("ratingFromStoredReplies", () => {
  const assistant = (content: string) => ({ role: "assistant" as const, content });

  it("recovers the rating from the last assistant reply of an older session", () => {
    expect(ratingFromStoredReplies([assistant("Q1"), { role: "user", content: "A" }, assistant("Done.\n\nSuggested rating: warm")])).toBe(3);
    expect(ratingFromStoredReplies([assistant("Done.\nSuggested rating: 5")])).toBe(5);
  });

  it("returns undefined when there is none", () => {
    expect(ratingFromStoredReplies([assistant("Just a question?")])).toBeUndefined();
    expect(ratingFromStoredReplies([])).toBeUndefined();
  });
});
