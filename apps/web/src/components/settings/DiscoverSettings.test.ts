// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requestJson } from "@/lib/api-client";
import { getNoteSettings, updateNoteSettings } from "@/lib/notes-firestore";
import { forgetExplore } from "@/lib/useExplore";
import { DiscoverSettings } from "./DiscoverSettings";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
const user = vi.hoisted(() => ({ uid: "u1", getIdToken: async () => "token" }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/lib/api-client", () => ({ requestJson: vi.fn() }));
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
  vi.mocked(requestJson).mockResolvedValue({ categories: ["Big Ideas Simply Explained", "Astronomy", "DIY"] });
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

const suggestions = () => [...container.querySelectorAll("datalist option")].map((o) => o.getAttribute("value"));

it("suggests the articles account's categories that are not keywords yet, as the keyword field's autocomplete", async () => {
  await render();
  expect(requestJson).toHaveBeenCalledWith("/api/discover/categories", "token");
  const list = container.querySelector("datalist")!;
  expect(field("Add a keyword").getAttribute("list")).toBe(list.id);
  expect(suggestions()).toEqual(["Big Ideas Simply Explained", "DIY"]);

  await setValue(field("Add a keyword"), "DIY");
  await click(button("Add"));
  expect(suggestions()).toEqual(["Big Ideas Simply Explained"]);
});

it("shows that the categories are loading", async () => {
  vi.mocked(requestJson).mockReturnValue(new Promise(() => {}));
  await render();
  expect(container.textContent).toContain("Loading your categories");
});

it("shows a failure to load the categories in full, and keywords can still be typed", async () => {
  vi.mocked(requestJson).mockRejectedValue(new Error("TURSO_DATABASE_URL is not set"));
  await render();
  const alert = [...container.querySelectorAll("[role='alert']")].find((a) => a.textContent?.includes("TURSO_DATABASE_URL"));
  expect(alert?.textContent).toContain("Could not load your categories");
  expect(alert?.className).toContain("select-all");
  expect(field("Add a keyword").disabled).toBe(false);
});

it("does not ask for categories until an articles account is saved, then loads that account's", async () => {
  vi.mocked(getNoteSettings).mockResolvedValue({ articlesAppUid: null, interestKeywords: [] });
  await render();
  expect(requestJson).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Save your articles account to get category suggestions");

  await setValue(field("Articles account uid"), "art-9");
  await click(button("Save"));
  expect(requestJson).toHaveBeenCalledWith("/api/discover/categories", "token");
  expect(suggestions()).toEqual(["Big Ideas Simply Explained", "Astronomy", "DIY"]);
});
