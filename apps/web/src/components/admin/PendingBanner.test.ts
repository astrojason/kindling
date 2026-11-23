// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AuthClaims } from "@/lib/auth-guard";
import { PendingBanner } from "./PendingBanner";

let state: { count: number | null; error: string | null } = { count: null, error: null };
vi.mock("@/lib/usePendingRequests", () => ({ usePendingRequests: () => state }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { uid: "me" }, claims: { admin: true } as AuthClaims }) }));
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
const render = async (s: typeof state) => { state = s; await act(async () => root.render(createElement(PendingBanner))); };

it("tells an admin that people are waiting and links to the access page", async () => {
  await render({ count: 2, error: null });
  expect(container.textContent).toContain("2 people waiting for access");
  expect(container.querySelector("a")?.getAttribute("href")).toBe("/admin/access");
});

it("uses the singular for one person", async () => {
  await render({ count: 1, error: null });
  expect(container.textContent).toContain("1 person waiting for access");
});

it("shows nothing when nobody is waiting, or the count is unknown", async () => {
  await render({ count: 0, error: null });
  expect(container.textContent).toBe("");
  await render({ count: null, error: null });
  expect(container.textContent).toBe("");
});

it("shows a failure to watch in full rather than hiding that the check is broken", async () => {
  await render({ count: null, error: "Missing or insufficient permissions." });
  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Missing or insufficient permissions.");
  expect(alert?.className).toContain("select-all");
});
