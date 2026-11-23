// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Note } from "@random-knowledge/shared/notes";
import { NotesLibrary } from "./NotesLibrary";

vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));

const NOW = new Date(2026, 10, 22, 12, 0);
const at = (days: number) => ({ toDate: () => new Date(2026, 10, 22 + days, 8, 0) }) as unknown as Note["created_at"];
const note = (over: Partial<Note> & { id: string }): Note => ({
  title: "T", tag: "tag", source_url: null, what_it_said: "", why_it_matters: "", application: "",
  created_at: at(0), next_review_at: at(1), last_reviewed_at: null, interval_days: 1, easiness_factor: 2.5,
  session_count: 0, last_rating: null, deleted_at: null, ...over,
});
const notes = [
  note({ id: "a", title: "Black holes", tag: "physics", created_at: at(-10), last_rating: 4, last_reviewed_at: at(-2) }),
  note({ id: "b", title: "Sourdough", tag: "cooking", created_at: at(-1) }),
  note({ id: "c", title: "Quantum", tag: "physics", created_at: at(-5), last_rating: 2 }),
];

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

const render = (props: Partial<Parameters<typeof NotesLibrary>[0]> = {}) => act(async () => root.render(createElement(NotesLibrary, { notes, now: NOW, ...props })));
const titles = () => [...container.querySelectorAll("li a")].map((a) => a.querySelector("[data-title]")?.textContent);
const click = (el: Element | null | undefined) => act(async () => { (el as HTMLElement).click(); });
const byText = (selector: string, text: string) => [...container.querySelectorAll(selector)].find((el) => el.textContent === text);

it("lists every note, newest first, each linking to its page", async () => {
  await render();
  expect(titles()).toEqual(["Sourdough", "Quantum", "Black holes"]);
  expect([...container.querySelectorAll("li a")].map((a) => a.getAttribute("href"))).toEqual(["/notes/b", "/notes/c", "/notes/a"]);
  expect(container.textContent).toContain("3 notes");
});

it("shows added and reviewed ages", async () => {
  await render();
  expect(container.textContent).toContain("added 1w"); // ten days ago
  expect(container.textContent).toContain("reviewed 2d");
  expect(container.textContent).toContain("reviewed never");
});

it("filters by the search box and says when nothing matches", async () => {
  await render();
  const input = container.querySelector("input[aria-label='Search notes']") as HTMLInputElement;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => { setValue.call(input, "quant"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(titles()).toEqual(["Quantum"]);
  expect(container.textContent).toContain("1 of 3");

  await act(async () => { setValue.call(input, "zzz"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(titles()).toEqual([]);
  expect(container.textContent).toContain("No notes match");
});

it("filters by tag using the chips", async () => {
  await render();
  await click(byText("button", "physics"));
  expect(titles()).toEqual(["Quantum", "Black holes"]);
  await click(byText("button", "all"));
  expect(titles()).toHaveLength(3);
});

it("sorts by strength and by tag", async () => {
  await render();
  await click(byText("button", "strength"));
  expect(titles()).toEqual(["Black holes", "Quantum", "Sourdough"]);
  await click(byText("button", "tag"));
  expect(titles()).toEqual(["Sourdough", "Black holes", "Quantum"]);
});

it("shows an empty state with a way to capture the first note", async () => {
  await render({ notes: [] });
  expect(container.textContent).toContain("No notes yet");
  expect(container.querySelector("a[href='/notes/new']")).not.toBeNull();
});

it("shows a load error in full and selectable", async () => {
  await render({ notes: [], error: "Missing or insufficient permissions." });
  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Missing or insufficient permissions.");
  expect(alert?.className).toContain("select-all");
});

it("offers a way to capture a note", async () => {
  await render();
  expect(container.querySelector("a[href='/notes/new']")).not.toBeNull();
});

it("marks the notes whose review is due", async () => {
  await render({ notes: [note({ id: "due", title: "Overdue note", next_review_at: at(-3) }), note({ id: "later", title: "Later note", next_review_at: at(5) })] });
  const rows = [...container.querySelectorAll("li a")];
  const text = (title: string) => rows.find((r) => r.textContent?.includes(title))?.textContent ?? "";
  expect(text("Overdue note")).toContain("due now");
  expect(text("Later note")).not.toContain("due now");
  expect(text("Later note")).toContain("in 5d");
});
