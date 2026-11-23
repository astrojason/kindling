// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AuthClaims } from "@/lib/auth-guard";
import { SuperadminOnly } from "./SuperadminOnly";

let claims: AuthClaims | null = null;
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ claims }) }));

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
const render = async (c: AuthClaims | null) => {
  claims = c;
  await act(async () => root.render(createElement(SuperadminOnly, null, "secret log")));
  return container.textContent;
};

it("shows its content to a superadmin", async () => expect(await render({ superadmin: true })).toBe("secret log"));
it("tells an admin the page is for superadmins, without rendering the content", async () => {
  const out = await render({ admin: true });
  expect(out).toContain("superadmin");
  expect(out).not.toContain("secret log");
});
it("shows nothing of the content to someone with no claims", async () => expect(await render(null)).not.toContain("secret log"));
