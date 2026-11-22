import { describe, expect, it } from "vitest";
import { baseDate, lessonsNeeded, MAX_PLAN_LESSONS, slotKey, slotOf } from "@random-knowledge/shared/lesson-plan";
import { formatDateLabel } from "./date";
import { newReviewCards } from "./srs";
import type { Lesson } from "./types";

describe("daily plan lessons", () => {
  it("keys the first lesson by its date (unchanged) and extras with a slot suffix", () => {
    expect(slotKey("2026-11-22", 1)).toBe("2026-11-22");
    expect(slotKey("2026-11-22", 3)).toBe("2026-11-22~3");
  });
  it("reads the date and slot back out of a key", () => {
    expect(baseDate("2026-11-22~3")).toBe("2026-11-22");
    expect(baseDate("2026-11-22")).toBe("2026-11-22");
    expect(slotOf("2026-11-22~3")).toBe(3);
    expect(slotOf("2026-11-22")).toBe(1);
  });
  it("prepares enough lessons to cover the goal, at least 1 and at most the cap", () => {
    expect(lessonsNeeded(15, 4)).toBe(4);
    expect(lessonsNeeded(5, 4)).toBe(2);
    expect(lessonsNeeded(5, 10)).toBe(1);
    expect(lessonsNeeded(20, 1)).toBe(MAX_PLAN_LESSONS);
    expect(lessonsNeeded(10, 0)).toBe(MAX_PLAN_LESSONS);
  });
  it("labels a plan lesson's date with its number", () => {
    expect(formatDateLabel("2026-11-22~2")).toBe(`${formatDateLabel("2026-11-22")} · Lesson 2`);
    expect(formatDateLabel("2026-11-22")).not.toContain("Lesson");
  });
  it("schedules review cards from the lesson's date, not its key suffix", () => {
    const lesson: Lesson = { category: "nature", title: "T", body: ["a", "b", "c"], wikiQuery: "w", youtubeQuery: "y", quiz: [{ question: "Q", options: ["a", "b", "c", "d"], correctIndex: 0, explanation: "e" }] };
    expect(newReviewCards(lesson, "2026-11-22~2")[0]).toMatchObject({ id: "2026-11-22~2-0", due: "2026-11-23" });
  });
});
