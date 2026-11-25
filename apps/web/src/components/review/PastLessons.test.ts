// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getHistory, getStash } from "@/lib/firestore";
import { PastLessons } from "./PastLessons";

vi.mock("@/lib/firestore", () => ({ getHistory: vi.fn(), getStash: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/usePendingRequests", () => ({ usePendingRequests: () => ({ count: null, error: null }) }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: unknown }) => createElement("a", { href }, children as never) }));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getHistory).mockResolvedValue([
    { date: "2026-11-20", title: "Older", category: "nature" },
    { date: "2026-11-22", title: "Newer", category: "nature" },
  ] as never);
  vi.mocked(getStash).mockResolvedValue([{ id: "s1", title: "Saved one", category: "nature", sharedBy: "Ada", savedAt: "", lesson: {} }] as never);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const render = () => act(async () => root.render(createElement(PastLessons, { uid: "u1" })));
const hrefs = () => [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

it("lists previous lessons, newest first, and the lessons saved from others", async () => {
  await render();
  expect(hrefs()).toEqual(["/lesson/2026-11-22", "/lesson/2026-11-20", "/stash/s1"]);
  expect(container.textContent).toContain("Previous lessons");
  expect(container.textContent).toContain("from Ada");
});

it("leaves out the saved section when nothing is saved", async () => {
  vi.mocked(getStash).mockResolvedValue([]);
  await render();
  expect(hrefs()).not.toContain("/stash/s1");
  expect(container.textContent).not.toContain("Saved from others");
});

it("shows a failure to load in full", async () => {
  vi.mocked(getHistory).mockRejectedValue(new Error("Missing permissions"));
  await render();
  expect(container.querySelector("[role='alert']")?.textContent).toContain("Missing permissions");
});
