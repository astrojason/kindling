// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CATEGORY_KEYS } from "@/lib/categories";
import { getSelectedCategories, setSelectedCategories } from "@/lib/firestore";
import { CategorySettings } from "./CategorySettings";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/usePendingRequests", () => ({ usePendingRequests: () => ({ count: null, error: null }) }));
vi.mock("@/lib/firestore", () => ({ getSelectedCategories: vi.fn(), setSelectedCategories: vi.fn() }));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getSelectedCategories).mockResolvedValue([CATEGORY_KEYS[0], CATEGORY_KEYS[1]]);
  vi.mocked(setSelectedCategories).mockResolvedValue(undefined);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const render = () => act(async () => root.render(createElement(CategorySettings, { uid: "u1" })));
const boxes = () => [...container.querySelectorAll("input[type='checkbox']")] as HTMLInputElement[];
const checked = () => boxes().filter((b) => b.checked).map((b) => b.value);
const click = (el: Element | undefined) => act(async () => (el as HTMLElement).click());
const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;
const dialog = () => container.querySelector("[role='dialog']");
const submit = () => act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
const openEditor = async () => { await render(); await click(button("Edit categories")); };

it("summarises the chosen categories under a Categories heading, with the editor closed", async () => {
  await render();
  expect(getSelectedCategories).toHaveBeenCalledWith("u1");
  expect(container.querySelector("h2")?.textContent).toBe("Categories");
  expect(container.textContent).toContain(`2 of ${CATEGORY_KEYS.length} selected`);
  expect(dialog()).toBeNull();
  expect(boxes()).toHaveLength(0);
});

it("opens the editor in a dialog with the current choice", async () => {
  await openEditor();
  expect(dialog()?.getAttribute("aria-modal")).toBe("true");
  expect(checked()).toEqual([CATEGORY_KEYS[0], CATEGORY_KEYS[1]]);
});

it("starts with every category selected for someone who has never chosen", async () => {
  vi.mocked(getSelectedCategories).mockResolvedValue(null);
  await openEditor();
  expect(checked()).toHaveLength(CATEGORY_KEYS.length);
});

it("saves the new selection for future lessons, says so, closes and updates the summary", async () => {
  await openEditor();
  await click(boxes()[2]);
  await submit();

  expect(setSelectedCategories).toHaveBeenCalledWith("u1", [CATEGORY_KEYS[0], CATEGORY_KEYS[1], CATEGORY_KEYS[2]]);
  expect(toast).toHaveBeenCalledWith("Categories saved for future lessons.");
  expect(dialog()).toBeNull();
  expect(container.textContent).toContain(`3 of ${CATEGORY_KEYS.length} selected`);
});

it("closes without saving on cancel", async () => {
  await openEditor();
  await click(boxes()[2]);
  await click(button("Cancel"));
  expect(dialog()).toBeNull();
  expect(setSelectedCategories).not.toHaveBeenCalled();
});

it("will not save an empty selection", async () => {
  await openEditor();
  await click(button("Clear all"));
  expect(button("Save categories").disabled).toBe(true);
  expect(setSelectedCategories).not.toHaveBeenCalled();
});

it("shows a failed save in full, stays open and does not claim it saved", async () => {
  vi.mocked(setSelectedCategories).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await openEditor();
  await submit();

  expect(container.querySelector("[role='alert']")?.textContent).toContain("Missing or insufficient permissions.");
  expect(dialog()).not.toBeNull();
  expect(toast).not.toHaveBeenCalled();
});

it("shows a failure to load the categories in full", async () => {
  vi.mocked(getSelectedCategories).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  expect(container.textContent).toContain("Missing or insufficient permissions.");
  expect(button("Edit categories")).toBeUndefined();
});
