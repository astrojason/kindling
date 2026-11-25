// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TabBar } from "./TabBar";

let pending: number | null = null;
let explore: { loading: boolean; data: { hasArticles: boolean; lessons: unknown[] } | null; error: string | null } = { loading: false, data: { hasArticles: true, lessons: [] }, error: null };
vi.mock("@/lib/useExplore", async (orig) => ({ ...(await orig<typeof import("@/lib/useExplore")>()), useExplore: () => explore }));
vi.mock("@/lib/usePendingRequests", () => ({ usePendingRequests: () => ({ count: pending, error: null }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { uid: "me" }, claims: { admin: true } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/" }));
vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  explore = { loading: false, data: { hasArticles: true, lessons: [] }, error: null };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
const render = async (count: number | null) => { pending = count; await act(async () => root.render(createElement(TabBar))); };
const profileLink = () => container.querySelector("a[href='/profile']")!;

it("marks the Profile tab with how many people are waiting, so an admin sees it on every screen", async () => {
  await render(3);
  const badge = profileLink().querySelector("[aria-label='3 waiting for access']");
  expect(badge?.textContent).toBe("3");
});

it("shows no badge when nobody is waiting or the count is not known", async () => {
  await render(0);
  expect(profileLink().querySelector("[aria-label$='waiting for access']")).toBeNull();
  await render(null);
  expect(profileLink().querySelector("[aria-label$='waiting for access']")).toBeNull();
});

it("still lists the usual tabs", async () => {
  await render(null);
  expect([...container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["/", "/discover", "/notes", "/review", "/profile"]);
});

const hrefs = () => [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

it("shows Explore when lessons were generated for other people, even without an articles account", async () => {
  explore = { loading: false, data: { hasArticles: false, lessons: [{ id: "abc123", key: "2026-11-20" }] }, error: null };
  await render(null);
  expect(hrefs()).toContain("/discover");
});

it("hides Explore when there is no articles account and no one else's lessons, and while that is still loading", async () => {
  explore = { loading: false, data: { hasArticles: false, lessons: [] }, error: null };
  await render(null);
  expect(hrefs()).toEqual(["/", "/notes", "/review", "/profile"]);
  explore = { loading: true, data: null, error: null };
  await render(null);
  expect(hrefs()).not.toContain("/discover");
});

it("keeps Explore when checking fails, so the page can show the error", async () => {
  explore = { loading: false, data: null, error: "Firestore unavailable" };
  await render(null);
  expect(hrefs()).toContain("/discover");
});
