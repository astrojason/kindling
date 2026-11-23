// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Note } from "@random-knowledge/shared/notes";
import { subscribeToNotes, updateNote } from "@/lib/notes-firestore";
import { EditNote } from "./EditNote";

const push = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/notes-firestore", () => ({ updateNote: vi.fn(), subscribeToNotes: vi.fn() }));

const note = { id: "n1", title: "Black holes", tag: "physics", source_url: null, what_it_said: "W", why_it_matters: "Y", application: "A" } as unknown as Note;

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(subscribeToNotes).mockReturnValue((() => {}) as never);
  vi.mocked(updateNote).mockResolvedValue(undefined);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const render = () => act(async () => root.render(createElement(EditNote, { uid: "u1", note })));
const field = (label: string) => container.querySelector(`[aria-label='${label}']`) as HTMLInputElement | HTMLTextAreaElement;
const setValue = (el: Element, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  return act(async () => { el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const submit = () => act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });

it("starts from the note's current values", async () => {
  await render();
  expect(field("Title").value).toBe("Black holes");
  expect(field("What did it say?").value).toBe("W");
});

it("saves the changes, says so, and returns to the note", async () => {
  await render();
  await setValue(field("Title"), "Event horizons");
  await submit();

  expect(updateNote).toHaveBeenCalledWith("u1", "n1", { title: "Event horizons", tag: "physics", source_url: null, what_it_said: "W", why_it_matters: "Y", application: "A" });
  expect(toast).toHaveBeenCalledWith("Note updated.");
  expect(push).toHaveBeenCalledWith("/notes/n1");
});

it("shows a failed save in the form and stays on the page", async () => {
  vi.mocked(updateNote).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  await submit();

  expect(container.querySelector("[role='alert']")?.textContent).toContain("Missing or insufficient permissions.");
  expect(push).not.toHaveBeenCalled();
});

it("cancels back to the note without saving", async () => {
  await render();
  await act(async () => (([...container.querySelectorAll("button")].find((b) => b.textContent === "Cancel")) as HTMLElement).click());
  expect(push).toHaveBeenCalledWith("/notes/n1");
  expect(updateNote).not.toHaveBeenCalled();
});
