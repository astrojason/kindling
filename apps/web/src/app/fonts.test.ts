// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// App Hosting's builders intermittently can't reach Google Fonts, which failed whole deploys
// ("Can't resolve '@vercel/turbopack-next/internal/font/google/font'"), so fonts ship with the app.
it("loads its font from a local file, never from Google Fonts at build time", () => {
  const layout = readFileSync(join(__dirname, "layout.tsx"), "utf8");
  expect(layout).not.toContain("next/font/google");
  expect(layout).toContain("next/font/local");
});
