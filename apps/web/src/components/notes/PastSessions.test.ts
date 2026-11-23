// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { NoteSession } from "@random-knowledge/shared/notes";
import { getCompletedSessions } from "@/lib/notes-firestore";
import { PastSessions } from "./PastSessions";

vi.mock("@/lib/notes-firestore", () => ({ getCompletedSessions: vi.fn() }));

const done = (id: string, ms: number, over: Partial<NoteSession> = {}): NoteSession => ({
  id, note_id: "n1", completed_at: { toDate: () => new Date(ms), toMillis: () => ms } as never, self_rating: 4, suggested_rating: 4,
  messages: [{ role: "assistant", content: `Question for ${id}?` }, { role: "user", content: `My answer for ${id}` }], ...over,
});

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const render = () => act(async () => root.render(createElement(PastSessions, { uid: "u1", noteId: "n1" })));
const toggles = () => [...container.querySelectorAll("button[aria-expanded]")] as HTMLButtonElement[];

it("shows a spinner while loading", async () => {
  vi.mocked(getCompletedSessions).mockReturnValue(new Promise(() => {}));
  await render();
  expect(container.textContent).toContain("Loading");
});

it("renders nothing when the note has no finished sessions", async () => {
  vi.mocked(getCompletedSessions).mockResolvedValue([]);
  await render();
  expect(container.textContent).toBe("");
});

it("lists each session with its date and rating, collapsed until opened", async () => {
  vi.mocked(getCompletedSessions).mockResolvedValue([done("s2", Date.UTC(2026, 10, 20, 12)), done("s1", Date.UTC(2026, 10, 1, 12), { self_rating: 2 })]);
  await render();

  expect(getCompletedSessions).toHaveBeenCalledWith("u1", "n1");
  expect(container.textContent).toContain("Past sessions");
  expect(toggles()).toHaveLength(2);
  expect(toggles()[0].textContent).toContain("Nov 20");
  expect(toggles()[1].querySelector("[aria-label='Strength 2 of 5']")).not.toBeNull();
  expect(container.textContent).not.toContain("Question for s2?");
});

it("opens and closes a transcript", async () => {
  vi.mocked(getCompletedSessions).mockResolvedValue([done("s2", Date.UTC(2026, 10, 20, 12))]);
  await render();

  await act(async () => toggles()[0].click());
  expect(toggles()[0].getAttribute("aria-expanded")).toBe("true");
  expect(container.textContent).toContain("Question for s2?");
  expect(container.textContent).toContain("My answer for s2");

  await act(async () => toggles()[0].click());
  expect(container.textContent).not.toContain("Question for s2?");
});

it("shows a load failure in full instead of hiding the history", async () => {
  vi.mocked(getCompletedSessions).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Missing or insufficient permissions.");
  expect(alert?.className).toContain("select-all");
});
