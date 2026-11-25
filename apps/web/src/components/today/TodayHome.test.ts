// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Note } from "@random-knowledge/shared/notes";
import { TodayHome } from "./TodayHome";

let notesState: { notes: Note[] | null; error: string | null } = { notes: [], error: null };
vi.mock("@/lib/useNotes", () => ({ useNotes: () => notesState }));
vi.mock("@/lib/useProgressData", () => ({ useProgressData: () => ({ loading: false, error: null, data: { stats: { xp: 0, goalMinutes: 15, seconds: {} }, cards: [] } }) }));
vi.mock("@/components/admin/PendingBanner", () => ({ PendingBanner: () => null }));
vi.mock("@/components/today/PlanCard", () => ({ PlanCard: () => null }));
vi.mock("@/components/today/GoalCard", () => ({ GoalCard: () => null }));
vi.mock("@/components/nav/SignOutButton", () => ({ SignOutButton: () => null }));
vi.mock("@/components/today/StatChips", () => ({ StatChips: () => null }));
vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));

const at = (days: number) => ({ toDate: () => new Date(Date.now() + days * 86_400_000) }) as unknown as Note["created_at"];
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
/** The phone layout; the desktop one is rendered beside it and shown from the lg breakpoint. */
const phone = () => container.querySelector(".lg\\:hidden")!;
const render = async (state: typeof notesState) => {
  notesState = state;
  await act(async () => root.render(createElement(TodayHome, { uid: "u1", date: "2026-11-22", plan: [], streak: { streak: 0, longest: 0, lastDate: null }, onStart: vi.fn(), onOpen: vi.fn(), onRetry: vi.fn() })));
};

it("counts the notes that are due in the Review row and lists them on Today, each opening the note", async () => {
  await render({ notes: [note("a", "Overdue note", -5), note("b", "Due today", -1), note("c", "Later", 7)], error: null });

  expect(container.querySelector("section[aria-label='Review']")?.textContent).toContain("2 notes due");
  const links = [...phone().querySelectorAll("a[href^='/notes/']")];
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["/notes/a", "/notes/b"]);
  expect(phone().textContent).toContain("2 notes to recall");
  expect(phone().textContent).not.toContain("Later");
});

it("says nothing is due, and lists nothing, when no note is due", async () => {
  await render({ notes: [note("c", "Later", 7)], error: null });
  expect(container.querySelector("section[aria-label='Review']")?.textContent).toContain("Nothing due right now");
  expect(phone().querySelector("a[href^='/notes/']")).toBeNull();
});

it("does not claim nothing is due while the notes are still loading", async () => {
  await render({ notes: null, error: null });
  expect(container.querySelector("section[aria-label='Review']")).toBeNull();
});

it("shows a failure to load the notes in full", async () => {
  await render({ notes: null, error: "Missing or insufficient permissions." });
  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Missing or insufficient permissions.");
  expect(alert?.className).toContain("select-all");
});

it("no longer offers category editing on Today (it lives in Settings), but keeps the other shortcuts", async () => {
  await render({ notes: [], error: null });
  expect(container.textContent).not.toContain("My categories");
  expect(container.textContent).toContain("Library");
  expect(container.textContent).toContain("Shared");
});

it("shows the desktop Today beside it: the notes due and those coming up, with the daily goal", async () => {
  await render({ notes: [note("a", "Overdue note", -5), note("c", "Later", 7)], error: null });
  const desktop = container.querySelector(".lg\\:flex")!;
  expect(desktop.textContent).toContain("1 NOTE TO RECALL");
  expect(desktop.textContent).toContain("Overdue note");
  expect(desktop.textContent).toContain("Later");
  expect(desktop.textContent).toContain("DAILY GOAL");
});
