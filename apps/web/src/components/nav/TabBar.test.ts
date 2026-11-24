// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TabBar } from "./TabBar";

let pending: number | null = null;
vi.mock("@/lib/usePendingRequests", () => ({ usePendingRequests: () => ({ count: pending, error: null }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { uid: "me" }, claims: { admin: true } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => "/" }));
vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));

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
  expect([...container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["/", "/library", "/notes", "/review", "/profile"]);
});
