// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AuthClaims } from "@/lib/auth-guard";
import { AdminFrame } from "./AdminFrame";

let claims: AuthClaims | null = null;
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { uid: "admin" }, claims }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/access" }));
vi.mock("@/components/nav/TabBar", () => ({ TabBar: () => null }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: { href: string; children: unknown }) => createElement("a", props, children as never) }));

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
const hrefs = async (c: AuthClaims) => {
  claims = c;
  await act(async () => root.render(createElement(AdminFrame, null, "content")));
  return [...container.querySelectorAll('nav[aria-label="Admin"] a')].map((a) => a.getAttribute("href"));
};

it("shows a superadmin every section", async () => {
  expect(await hrefs({ superadmin: true })).toEqual(["/admin/access", "/admin/generation-log", "/admin/cron-log"]);
});

it("shows an admin only the access page", async () => {
  expect(await hrefs({ admin: true })).toEqual(["/admin/access"]);
});

it("marks the open section as the current tab", async () => {
  await hrefs({ superadmin: true });
  const current = container.querySelector('nav[aria-label="Admin"] [aria-current="page"]');
  expect(current?.getAttribute("href")).toBe("/admin/access");
  expect(current?.getAttribute("role")).toBe("tab");
});

it("sits in the shared page frame with the Admin title bar", async () => {
  await hrefs({ superadmin: true });
  expect(container.querySelector("header h1")?.textContent).toBe("Admin");
});
