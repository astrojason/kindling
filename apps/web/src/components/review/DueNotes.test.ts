// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Note } from "@random-knowledge/shared/notes";
import { DueNotes } from "./DueNotes";

vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));

const NOW = new Date(2026, 10, 22, 12, 0);
const at = (days: number) => ({ toDate: () => new Date(2026, 10, 22 + days, 8, 0) }) as unknown as Note["created_at"];
const note = (id: string, title: string, due: number): Note => ({ id, title, tag: "physics", next_review_at: at(due) }) as unknown as Note;

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
const render = (props: Partial<Parameters<typeof DueNotes>[0]> = {}) => act(async () => root.render(createElement(DueNotes, { notes: [], error: null, now: NOW, ...props })));

it("lists the notes that are due, earliest first, each linking to the note itself", async () => {
  await render({ notes: [note("b", "Later today", 0), note("a", "Overdue", -2), note("c", "Tomorrow", 1)] });
  const links = [...container.querySelectorAll("a")];
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["/notes/a", "/notes/b"]);
  expect(links[0].textContent).toContain("Overdue");
  expect(links[0].textContent).toContain("physics");
  expect(links[0].textContent).not.toContain("quiz");
  expect(container.textContent).toContain("2 notes to recall");
});

it("uses the singular for one note", async () => {
  await render({ notes: [note("a", "Overdue", -1)] });
  expect(container.textContent).toContain("1 note to recall");
});

it("renders nothing when no note is due", async () => {
  await render({ notes: [note("c", "Tomorrow", 1)] });
  expect(container.textContent).toBe("");
});

it("shows a load error in full and selectable", async () => {
  await render({ error: "Missing or insufficient permissions." });
  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Missing or insufficient permissions.");
  expect(alert?.className).toContain("select-all");
});
