import { expect, it } from "vitest";
import { CATEGORY_KEYS, matchCategories } from "@random-knowledge/shared/categories";

it("returns every category for a blank filter", () => {
  expect(matchCategories("")).toEqual(CATEGORY_KEYS);
  expect(matchCategories("   ")).toEqual(CATEGORY_KEYS);
});

it("matches the shown name case-insensitively, anywhere in it", () => {
  expect(matchCategories("WOOD")).toEqual(["woodworking"]);
  expect(matchCategories("astro")).toContain("astronomy");
});

it("returns nothing when no name matches", () => {
  expect(matchCategories("zzzz")).toEqual([]);
});
