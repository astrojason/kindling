// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ExplorePage from "./page";

let explore: { loading: boolean; data: unknown; error: string | null } = { loading: false, data: null, error: null };
vi.mock("@/lib/useExplore", async (orig) => ({ ...(await orig<typeof import("@/lib/useExplore")>()), useExplore: () => explore }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { uid: "me", getIdToken: async () => "t" }, claims: {} }) }));
vi.mock("@/components/AccessGate", () => ({ AccessGate: ({ children }: { children: unknown }) => children }));
vi.mock("@/components/nav/TabBar", () => ({ TabBar: () => null }));
vi.mock("@/components/nav/SignOutButton", () => ({ SignOutButton: () => null }));
vi.mock("@/components/discover/DiscoverFeed", () => ({ DiscoverFeed: () => "Articles feed" }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: unknown }) => createElement("a", { href }, children as never) }));

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
const render = async (state: typeof explore) => { explore = state; await act(async () => root.render(createElement(ExplorePage))); };

it("shows the user's own articles feed when they have an articles account", async () => {
  await render({ loading: false, data: { hasArticles: true, lessons: [{ id: "abc123", key: "2026-11-20~2", title: "Tide pools", category: "nature" }] }, error: null });
  expect(container.textContent).toContain("Articles feed");
  expect(container.querySelector("a[href^='/explore/']")).toBeNull();
});

it("otherwise lists the lessons made for other people, each opening in Explore's reader", async () => {
  await render({ loading: false, data: { hasArticles: false, lessons: [{ id: "abc123", key: "2026-11-20~2", title: "Tide pools", category: "nature" }] }, error: null });
  const link = container.querySelector("a[href='/explore/abc123']");
  expect(link?.textContent).toContain("Tide pools");
  expect(container.textContent).not.toContain("Articles feed");
});

it("explains how to fill Explore when there is nothing to show", async () => {
  await render({ loading: false, data: { hasArticles: false, lessons: [] }, error: null });
  expect(container.textContent).toMatch(/articles account/i);
  expect(container.querySelector("a[href='/profile']")).not.toBeNull();
});

it("shows a failure in full", async () => {
  await render({ loading: false, data: null, error: "Firestore unavailable" });
  expect(container.querySelector("[role='alert']")?.textContent).toContain("Firestore unavailable");
});
