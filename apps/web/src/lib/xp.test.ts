import { describe, expect, it } from "vitest";
import { gameXp, goalFraction, goalReached, lessonXp, levelFor, minutesOn, reviewXp, weekDays, XP_PER_LEVEL } from "@random-knowledge/shared/xp";

describe("xp", () => {
  it("gives 10 per correct answer plus a 15 point completion bonus", () => {
    expect(lessonXp(3)).toBe(45);
    expect(lessonXp(0)).toBe(15);
  });
  it("gives 20 for a game plus a speed bonus that shrinks by 2 per miss", () => {
    expect(gameXp(0)).toBe(30);
    expect(gameXp(3)).toBe(24);
    expect(gameXp(9)).toBe(20);
  });
  it("rewards review ratings", () => {
    expect([reviewXp("again"), reviewXp("hard"), reviewXp("good"), reviewXp("easy")]).toEqual([1, 3, 5, 5]);
  });
  it("levels up every 200 xp", () => {
    expect(XP_PER_LEVEL).toBe(200);
    expect(levelFor(0)).toBe(1);
    expect(levelFor(199)).toBe(1);
    expect(levelFor(200)).toBe(2);
  });
  it("lists the Monday-first week containing a date", () => {
    expect(weekDays("2026-11-21")).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(weekDays("2026-11-22")[0]).toBe("2026-11-16");
  });
  it("turns stored seconds into whole minutes and a capped goal fraction", () => {
    const stats = { xp: 0, goalMinutes: 10, seconds: { "2026-11-21": 330 } };
    expect(minutesOn(stats, "2026-11-21")).toBe(5);
    expect(minutesOn(stats, "2026-11-20")).toBe(0);
    expect(goalFraction(stats, "2026-11-21")).toBe(0.55);
    expect(goalFraction({ ...stats, seconds: { "2026-11-21": 9999 } }, "2026-11-21")).toBe(1);
  });
  it("reports the goal as reached once the day's learning time covers it", () => {
    const stats = { xp: 0, goalMinutes: 10, seconds: { "2026-11-21": 599 } };
    expect(goalReached(stats, "2026-11-21")).toBe(false);
    expect(goalReached({ ...stats, seconds: { "2026-11-21": 600 } }, "2026-11-21")).toBe(true);
    expect(goalReached(stats, "2026-11-22")).toBe(false);
  });
});
