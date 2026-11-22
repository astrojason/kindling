import { describe, expect, it } from "vitest";
import { addDays, dueCards, newReviewCards, rateCard } from "@random-knowledge/shared/srs";
import type { Lesson } from "@random-knowledge/shared/types";

const lesson: Lesson = {
  category: "nature", title: "T", body: ["a", "b", "c"], wikiQuery: "w", youtubeQuery: "y",
  quiz: [
    { question: "Q1", options: ["a", "b", "c", "d"], correctIndex: 1, explanation: "E1" },
    { question: "Q2", options: ["a", "b", "c", "d"], correctIndex: 2, explanation: "E2" },
  ],
};

describe("spaced repetition", () => {
  it("adds calendar days to a date string", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
  });
  it("makes one card per quiz question, in box 1 and due the next day", () => {
    const cards = newReviewCards(lesson, "2026-11-21");
    expect(cards.map((c) => c.id)).toEqual(["2026-11-21-0", "2026-11-21-1"]);
    expect(cards[0]).toMatchObject({ question: "Q1", correctIndex: 1, box: 1, due: "2026-11-22", category: "nature", lessonTitle: "T" });
  });
  it("moves boxes: again resets, hard stays, good +1, easy +2, capped at the last box", () => {
    const [card] = newReviewCards(lesson, "2026-11-21");
    expect(rateCard(card, "again", "2026-11-22")).toMatchObject({ box: 0, due: "2026-11-22" });
    expect(rateCard(card, "hard", "2026-11-22")).toMatchObject({ box: 1, due: "2026-11-23" });
    expect(rateCard(card, "good", "2026-11-22")).toMatchObject({ box: 2, due: "2026-11-25" });
    expect(rateCard(card, "easy", "2026-11-22")).toMatchObject({ box: 3, due: "2026-11-29" });
    expect(rateCard({ ...card, box: 6 }, "easy", "2026-11-22").box).toBe(6);
  });
  it("lists only due cards, oldest first", () => {
    const [a, b] = newReviewCards(lesson, "2026-11-21");
    expect(dueCards([a, { ...b, due: "2026-11-20" }], "2026-11-22").map((c) => c.id)).toEqual([b.id, a.id]);
    expect(dueCards([a], "2026-11-21")).toEqual([]);
  });
});
