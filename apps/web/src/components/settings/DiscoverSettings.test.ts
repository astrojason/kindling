// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getNoteSettings, updateNoteSettings } from "@/lib/notes-firestore";
import { forgetExplore } from "@/lib/useExplore";
import { DiscoverSettings } from "./DiscoverSettings";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/usePendingRequests", () => ({ usePendingRequests: () => ({ count: null, error: null }) }));
vi.mock("@/lib/useExplore", () => ({ forgetExplore: vi.fn() }));
vi.mock("@/lib/notes-firestore", () => ({ getNoteSettings: vi.fn(), updateNoteSettings: vi.fn() }));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getNoteSettings).mockResolvedValue({ articlesAppUid: "art-1", interestKeywords: ["woodworking", "astronomy"] });
  vi.mocked(updateNoteSettings).mockResolvedValue(undefined);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const render = () => act(async () => root.render(createElement(DiscoverSettings, { uid: "u1" })));
const setValue = (el: Element, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  return act(async () => { el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const field = (label: string) => container.querySelector(`input[aria-label='${label}']`) as HTMLInputElement;
const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;
const click = (el: Element | undefined) => act(async () => (el as HTMLElement).click());
const chips = () => [...container.querySelectorAll("[data-keyword]")].map((c) => c.getAttribute("data-keyword"));

it("shows a spinner, then the saved account and keywords", async () => {
  await render();
  expect(getNoteSettings).toHaveBeenCalledWith("u1");
  expect(field("Articles account uid").value).toBe("art-1");
  expect(chips()).toEqual(["woodworking", "astronomy"]);
});

it("adds a keyword with the button or Enter, ignoring blanks and duplicates", async () => {
  await render();
  await setValue(field("Add a keyword"), "  Chemistry ");
  await click(button("Add"));
  expect(chips()).toEqual(["woodworking", "astronomy", "Chemistry"]);
  expect(field("Add a keyword").value).toBe("");

  await setValue(field("Add a keyword"), "ASTRONOMY");
  await act(async () => { field("Add a keyword").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  expect(chips()).toEqual(["woodworking", "astronomy", "Chemistry"]);
});

it("removes a keyword from the draft without saving anything yet", async () => {
  await render();
  await click(container.querySelector("button[aria-label='Remove keyword woodworking']")!);
  expect(chips()).toEqual(["astronomy"]);
  expect(updateNoteSettings).not.toHaveBeenCalled();
});

it("saves the trimmed account and the keywords, with progress and a confirmation", async () => {
  await render();
  let finish!: () => void;
  vi.mocked(updateNoteSettings).mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  await setValue(field("Articles account uid"), "  art-2  ");
  await click(button("Save"));

  expect(button("Saving…").disabled).toBe(true);
  expect(updateNoteSettings).toHaveBeenCalledWith("u1", { articlesAppUid: "art-2", interestKeywords: ["woodworking", "astronomy"] });

  await act(async () => finish());
  expect(toast).toHaveBeenCalledWith("Discover settings saved.");
  // Explore (and whether its tab shows) depends on the account, so its cached answer is dropped.
  expect(forgetExplore).toHaveBeenCalledWith("u1");
  expect(button("Save").disabled).toBe(false);
});

it("clears the account when the field is emptied", async () => {
  await render();
  await setValue(field("Articles account uid"), "   ");
  await click(button("Save"));
  expect(updateNoteSettings).toHaveBeenCalledWith("u1", { articlesAppUid: null, interestKeywords: ["woodworking", "astronomy"] });
});

it("shows a failed save in full and keeps the draft", async () => {
  vi.mocked(updateNoteSettings).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  await click(button("Save"));

  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Missing or insufficient permissions.");
  expect(alert?.className).toContain("select-all");
  expect(toast).not.toHaveBeenCalled();
  expect(chips()).toEqual(["woodworking", "astronomy"]);
});

it("shows a failure to load the settings in full", async () => {
  vi.mocked(getNoteSettings).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  expect(container.textContent).toContain("Missing or insufficient permissions.");
});
