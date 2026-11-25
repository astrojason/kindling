// @vitest-environment node
import { expect, it } from "vitest";
import { exploreLessonId, EXPLORE_ID } from "./explore-id";

it("is a stable 32-character id that doesn't reveal the account", () => {
  const id = exploreLessonId("Xk29PqUserId01", "2026-11-20~2");
  expect(id).toMatch(EXPLORE_ID);
  expect(id).toBe(exploreLessonId("Xk29PqUserId01", "2026-11-20~2"));
  expect(id).not.toContain("Xk29PqUserId01");
});

it("differs for each lesson and each account", () => {
  const ids = new Set([exploreLessonId("a", "2026-11-20"), exploreLessonId("a", "2026-11-20~2"), exploreLessonId("b", "2026-11-20")]);
  expect(ids.size).toBe(3);
});
