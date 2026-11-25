// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AuthClaims } from "@/lib/auth-guard";
import { SettingsFrame } from "./SettingsFrame";

let claims: AuthClaims | null = null;
let pathname = "/settings";
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { uid: "me" }, claims }) }));
vi.mock("@/lib/usePendingRequests", () => ({ usePendingRequests: () => ({ count: 2, error: null }) }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/components/nav/TabBar", () => ({ TabBar: () => null }));
vi.mock("@/components/nav/SignOutButton", () => ({ SignOutButton: () => null }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: { href: string; children: unknown }) => createElement("a", props, children as never) }));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  pathname = "/settings";
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
const render = async (c: AuthClaims) => {
  claims = c;
  await act(async () => root.render(createElement(SettingsFrame, null, "content")));
};
const tabs = () => [...container.querySelectorAll('[role="tab"]')].map((a) => a.getAttribute("href"));

it("shows a superadmin Settings and every admin section as tabs", async () => {
  await render({ superadmin: true });
  expect(tabs()).toEqual(["/settings", "/admin/access", "/admin/generation-log", "/admin/cron-log"]);
});

it("shows an admin Settings and Manage access", async () => {
  await render({ admin: true });
  expect(tabs()).toEqual(["/settings", "/admin/access"]);
});

it("shows everyone else just the settings, with no tabs", async () => {
  await render({});
  expect(tabs()).toEqual([]);
  expect(container.textContent).toContain("content");
});

it("marks the open section as current", async () => {
  pathname = "/admin/access";
  await render({ superadmin: true });
  expect(container.querySelector('[aria-current="page"]')?.getAttribute("href")).toBe("/admin/access");
});

it("shows how many people are waiting on the Manage access tab", async () => {
  await render({ admin: true });
  expect(container.querySelector('a[href="/admin/access"]')?.textContent).toContain("2");
});

it("is titled Settings", async () => {
  await render({ admin: true });
  expect(container.querySelector("header h1")?.textContent).toBe("Settings");
});
