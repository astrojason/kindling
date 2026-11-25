// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TabBar } from "./TabBar";

const explore: { loading: boolean; data: { hasArticles: boolean; lessons: unknown[] } | null; error: string | null } = { loading: false, data: { hasArticles: true, lessons: [] }, error: null };
vi.mock("@/lib/useExplore", async (orig) => ({ ...(await orig<typeof import("@/lib/useExplore")>()), useExplore: () => explore }));
vi.mock("@/lib/usePendingRequests", () => ({ usePendingRequests: () => ({ count: null, error: null }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { uid: "me" }, claims: {} }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/notes" }));
vi.mock("next/link", () => ({ default: ({ href, children, className, ...rest }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className, ...rest }, children as never) }));

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
const render = () => act(async () => root.render(createElement(TabBar)));

it("is a bottom bar on a phone and a left sidebar on a desktop", async () => {
  await render();
  const nav = container.querySelector("nav[aria-label='Main']")!;
  expect(nav.className).toContain("bottom-0");
  expect(nav.className).toContain("lg:inset-y-0");
  expect(nav.className).toContain("lg:w-[76px]");
});

it("shows the app's flame mark at the top of the desktop rail, which has no room for its name", async () => {
  await render();
  const brand = container.querySelector("[aria-label='Kindling']");
  expect(brand?.className).toContain("hidden");
  expect(brand?.className).toContain("lg:block");
});

it("still marks the current tab, whichever layout is showing", async () => {
  await render();
  expect(container.querySelector("a[aria-current='page']")?.getAttribute("href")).toBe("/notes");
});
