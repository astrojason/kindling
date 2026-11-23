// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createNote, incrementNotesStats, subscribeToNotes } from "@/lib/notes-firestore";
import { NewNote } from "./NewNote";

const push = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/notes-firestore", () => ({ createNote: vi.fn(), incrementNotesStats: vi.fn(), subscribeToNotes: vi.fn() }));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(subscribeToNotes).mockImplementation(((_uid: string, onNotes: (n: unknown[]) => void) => { onNotes([{ tag: "physics" }, { tag: "cooking" }]); return () => {}; }) as never);
  vi.mocked(createNote).mockResolvedValue("new-id");
  vi.mocked(incrementNotesStats).mockResolvedValue(undefined);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const render = () => act(async () => root.render(createElement(NewNote, { uid: "u1", getToken: async () => "tok" })));
const setValue = (el: Element, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  return act(async () => { el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const field = (label: string) => container.querySelector(`[aria-label='${label}']`)!;
const fillAndSave = async () => {
  await setValue(field("Title"), "Black holes");
  await setValue(field("Tag"), "physics");
  await setValue(field("What did it say?"), "W");
  await setValue(field("Why does it matter?"), "Y");
  await setValue(field("How would you explain it?"), "A");
  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
};

it("offers the user's existing tags", async () => {
  await render();
  const chips = [...container.querySelectorAll("form button[type='button']")].map((b) => b.textContent);
  expect(chips).toEqual(expect.arrayContaining(["physics", "cooking"]));
});

it("saves the note under the user, counts it, confirms, and opens it", async () => {
  await render();
  await fillAndSave();

  expect(createNote).toHaveBeenCalledWith("u1", { title: "Black holes", tag: "physics", source_url: null, what_it_said: "W", why_it_matters: "Y", application: "A" });
  expect(incrementNotesStats).toHaveBeenCalledWith("u1", { total_notes: 1 });
  expect(toast).toHaveBeenCalledWith("Note saved.");
  expect(push).toHaveBeenCalledWith("/notes/new-id");
});

it("shows a failed save in the form and goes nowhere", async () => {
  vi.mocked(createNote).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  await fillAndSave();

  expect(container.querySelector("[role='alert']")?.textContent).toContain("Missing or insufficient permissions.");
  expect(incrementNotesStats).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

it("reports a failed count update instead of hiding it, and still opens the saved note", async () => {
  vi.mocked(incrementNotesStats).mockRejectedValue(new Error("quota exceeded"));
  await render();
  await fillAndSave();

  expect(toast).toHaveBeenCalledWith(expect.stringContaining("quota exceeded"));
  expect(toast).not.toHaveBeenCalledWith("Note saved.");
  expect(console.error).toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith("/notes/new-id");
});

it("fills the form from an AI draft, ready to review and edit", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ tag: "astronomy", what_it_said: "Drafted what", why_it_matters: "Drafted why", application: "Drafted how" })));
  await render();
  await setValue(field("Article title"), "Black holes");
  await setValue(field("Article text"), "A long article about black holes");
  await act(async () => (([...container.querySelectorAll("button")].find((b) => b.textContent === "Draft a note")) as HTMLElement).click());

  expect((field("Title") as HTMLInputElement).value).toBe("Black holes");
  expect((field("Tag") as HTMLInputElement).value).toBe("astronomy");
  expect((field("What did it say?") as HTMLTextAreaElement).value).toBe("Drafted what");
  expect((field("How would you explain it?") as HTMLTextAreaElement).value).toBe("Drafted how");
  expect(createNote).not.toHaveBeenCalled(); // a draft is never saved on its own
});
