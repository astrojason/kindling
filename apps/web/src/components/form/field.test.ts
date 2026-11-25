// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fieldClass } from "./field";
import { Select } from "./Select";

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

it("squares fields off like the buttons rather than rounding them like cards", () => {
  expect(fieldClass).toContain("rounded-button");
  expect(fieldClass).not.toMatch(/rounded-(sm|md|lg|full)/);
});

it("draws its own chevron inside the select's padding instead of the browser's", async () => {
  await act(async () => root.render(createElement(Select, { "aria-label": "Category", value: "", onChange: () => {} }, createElement("option", { value: "" }, "All"))));
  const select = container.querySelector("select")!;
  expect(select.className).toContain("appearance-none");
  expect(select.className).toContain("pr-9");
  expect(select.className).toContain("rounded-button");
  const chevron = container.querySelector("svg")!;
  expect(chevron.getAttribute("aria-hidden")).toBe("true");
  expect(chevron.getAttribute("class")).toContain("pointer-events-none");
});

/** Every text field in the app takes the shared style, so none is left with the card radius. */
it("no component styles its own input, textarea or select", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith(".tsx") && !path.includes(".test.")) files.push(path);
    }
  };
  walk(join(__dirname, "../.."));
  const offenders = files.filter((f) => /<(input|textarea|select)\b[^>]*?className="[^"]*rounded-/.test(readFileSync(f, "utf8")));
  expect(offenders).toEqual([]);
});
