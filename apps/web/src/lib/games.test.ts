import { describe, expect, it } from "vitest";
import { gameFor, isOrderCorrect, shuffleSeeded } from "@random-knowledge/shared/games";
import type { Lesson } from "@random-knowledge/shared/types";

const base: Lesson = { category: "nature", title: "T", body: ["a", "b", "c"], wikiQuery: "w", youtubeQuery: "y", quiz: [] };

describe("mini-games", () => {
  it("has no game for lessons saved without game data", () => {
    expect(gameFor(base, "2026-11-21")).toBeNull();
  });
  it("picks among the games the lesson has, rotating by date", () => {
    const lesson: Lesson = {
      ...base,
      games: {
        pairs: [{ term: "a", meaning: "1" }, { term: "b", meaning: "2" }, { term: "c", meaning: "3" }, { term: "d", meaning: "4" }],
        order: { prompt: "Put in order", items: ["1", "2", "3", "4"] },
        trueFalse: [{ statement: "s", isTrue: true }, { statement: "t", isTrue: false }],
      },
    };
    const kinds = new Set(["2026-11-21", "2026-11-22", "2026-11-23"].map((d) => gameFor(lesson, d)?.kind));
    expect(kinds).toEqual(new Set(["pairs", "order", "trueFalse"]));
  });
  it("shuffles deterministically without losing items", () => {
    const items = ["a", "b", "c", "d"];
    expect(shuffleSeeded(items, "x")).toEqual(shuffleSeeded(items, "x"));
    expect([...shuffleSeeded(items, "x")].sort()).toEqual(items);
  });
  it("checks an order against the correct one", () => {
    expect(isOrderCorrect(["1", "2"], ["1", "2"])).toBe(true);
    expect(isOrderCorrect(["2", "1"], ["1", "2"])).toBe(false);
  });
});
