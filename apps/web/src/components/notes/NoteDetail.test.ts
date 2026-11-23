// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Note } from "@random-knowledge/shared/notes";
import { decrementNoteCount, getCompletedSessions, softDeleteNote } from "@/lib/notes-firestore";
import { NoteDetail } from "./NoteDetail";

const push = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/notes-firestore", () => ({ softDeleteNote: vi.fn(), decrementNoteCount: vi.fn(), getCompletedSessions: vi.fn() }));

const at = (days: number) => ({ toDate: () => new Date(Date.now() + days * 86_400_000) }) as unknown as Note["created_at"];
const note: Note = {
  id: "n1", title: "Black holes", tag: "physics", source_url: "https://example.com/bh",
  what_it_said: "They **bend** light", why_it_matters: "Explains lensing", application: "Like a heavy ball on a sheet",
  created_at: at(-3), next_review_at: at(2), last_reviewed_at: at(-1), interval_days: 6, easiness_factor: 2.5, session_count: 2, last_rating: 4, deleted_at: null,
};

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(softDeleteNote).mockResolvedValue(undefined);
  vi.mocked(decrementNoteCount).mockResolvedValue(undefined);
  vi.mocked(getCompletedSessions).mockResolvedValue([]);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const render = () => act(async () => root.render(createElement(NoteDetail, { uid: "u1", note })));
const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;
const click = (el: Element | undefined) => act(async () => (el as HTMLElement).click());

it("shows the note: tag, title, the three sections rendered as markdown, and the source", async () => {
  await render();
  expect(container.textContent).toContain("physics");
  expect(container.querySelector("h1")?.textContent).toBe("Black holes");
  expect(container.querySelector("strong")?.textContent).toBe("bend");
  for (const text of ["Explains lensing", "Like a heavy ball on a sheet"]) expect(container.textContent).toContain(text);
  expect(container.querySelector("a[href='https://example.com/bh']")?.getAttribute("target")).toBe("_blank");
});

it("shows where the note stands in its review schedule", async () => {
  await render();
  expect(container.textContent).toContain("Reviews 2");
  expect(container.textContent).toContain("next in 2d");
  expect(container.querySelector("[aria-label='Strength 4 of 5']")).not.toBeNull();
});

it("links to the quiz and to editing", async () => {
  await render();
  expect(container.querySelector("a[href='/notes/n1/session']")).not.toBeNull();
  expect(container.querySelector("a[href='/notes/n1/edit']")).not.toBeNull();
});

it("opens the speed reader on the 'what it said' text and closes it again", async () => {
  await render();
  await click(button("Speed read"));
  const reader = container.querySelector("[role='dialog']");
  expect(reader).not.toBeNull();
  expect(reader?.textContent).toContain("They");
  await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
  expect(container.querySelector("[role='dialog']")).toBeNull();
});

it("asks before deleting, naming the note, and deletes nothing on cancel", async () => {
  await render();
  await click(button("Delete"));
  expect(container.querySelector("[role='alertdialog']")?.textContent).toContain("Black holes");
  expect(softDeleteNote).not.toHaveBeenCalled();

  await click(button("Cancel"));
  expect(container.querySelector("[role='alertdialog']")).toBeNull();
  expect(softDeleteNote).not.toHaveBeenCalled();
});

it("deletes after confirming: soft-deletes, updates the count, says so, and returns to the list", async () => {
  await render();
  await click(button("Delete"));
  await click(container.querySelector("[role='alertdialog'] button:last-of-type") as HTMLElement);

  expect(softDeleteNote).toHaveBeenCalledWith("u1", "n1");
  expect(decrementNoteCount).toHaveBeenCalledWith("u1");
  expect(toast).toHaveBeenCalledWith("Note deleted.");
  expect(push).toHaveBeenCalledWith("/notes");
});

it("shows a failed delete in the dialog and stays on the note", async () => {
  vi.mocked(softDeleteNote).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  await click(button("Delete"));
  await click(container.querySelector("[role='alertdialog'] button:last-of-type") as HTMLElement);

  expect(container.querySelector("[role='alertdialog'] pre[role='alert']")?.textContent).toContain("Missing or insufficient permissions.");
  expect(decrementNoteCount).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

it("reports a failed count update instead of hiding it, and still returns to the list", async () => {
  vi.mocked(decrementNoteCount).mockRejectedValue(new Error("quota exceeded"));
  await render();
  await click(button("Delete"));
  await click(container.querySelector("[role='alertdialog'] button:last-of-type") as HTMLElement);

  expect(toast).toHaveBeenCalledWith(expect.stringContaining("quota exceeded"));
  expect(toast).not.toHaveBeenCalledWith("Note deleted.");
  expect(push).toHaveBeenCalledWith("/notes");
});
