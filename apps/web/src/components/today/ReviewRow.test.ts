// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReviewRow } from "./ReviewRow";

vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));

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
const render = (props: Partial<Parameters<typeof ReviewRow>[0]>) => act(async () => root.render(createElement(ReviewRow, { dueCards: 0, totalCards: 0, dueNotes: 0, totalNotes: 0, ...props })));

it("shows overdue notes as due and links to Review, even when no lesson card is due", async () => {
  await render({ totalCards: 4, dueCards: 0, totalNotes: 8, dueNotes: 3 });
  expect(container.textContent).toContain("3 notes due");
  expect(container.querySelector("a")?.getAttribute("href")).toBe("/review");
  expect(container.querySelector("a")?.textContent).toBe("Start");
});

it("adds cards and notes together", async () => {
  await render({ totalCards: 4, dueCards: 2, totalNotes: 8, dueNotes: 3 });
  expect(container.textContent).toContain("2 cards and 3 notes due");
  expect(container.querySelector("span")?.textContent).toBe("5");
});

it("says Done when nothing is due", async () => {
  await render({ totalCards: 4, totalNotes: 8 });
  expect(container.textContent).toContain("Nothing due right now");
  expect(container.querySelector("a")).toBeNull();
  expect(container.textContent).toContain("Done");
});
