import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const sources = (() => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".tsx") && !path.includes(".test.")) files.push(path);
    }
  };
  walk(join(__dirname, "../.."));
  return files.map((path) => ({ path, text: readFileSync(path, "utf8") }));
})();

/** Buttons are squared off (rounded-button); the card radii are for cards. Circles (rounded-full) are fine. */
it("no button uses a card radius", () => {
  const buttons = (text: string) => text.match(/<button\b[\s\S]*?<\/button>/g) ?? [];
  const offenders = sources.filter(({ text }) => buttons(text).some((b) => /\brounded-(xs|sm|md|lg)\b/.test(b))).map((s) => s.path);
  expect(offenders).toEqual([]);
});

/** Secondary buttons share one outline: a 2px border and extra-bold label, not a 1px border and semibold. */
it("no button uses the thin semibold outline", () => {
  const offenders = sources.filter(({ text }) => /\bborder border-border\b[^"`]*\bfont-semibold\b/.test(text)).map((s) => s.path);
  expect(offenders).toEqual([]);
});
