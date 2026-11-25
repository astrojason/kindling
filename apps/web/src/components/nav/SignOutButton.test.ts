// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SignOutButton } from "./SignOutButton";

const signOut = vi.fn<() => Promise<void>>();
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ signOut }) }));

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  signOut.mockReset();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const button = () => container.querySelector("button")!;

it("is a labelled door icon that signs out", async () => {
  signOut.mockResolvedValue(undefined);
  await act(async () => root.render(createElement(SignOutButton)));
  expect(button().getAttribute("aria-label")).toBe("Sign out");
  expect(button().querySelector("svg")).not.toBeNull();
  await act(async () => button().click());
  expect(signOut).toHaveBeenCalledOnce();
});

it("is disabled and says so while signing out", async () => {
  signOut.mockReturnValue(new Promise(() => {}));
  await act(async () => root.render(createElement(SignOutButton)));
  await act(async () => button().click());
  expect(button().disabled).toBe(true);
  expect(button().getAttribute("aria-label")).toBe("Signing out…");
});

it("shows the full error when signing out fails, and can be tried again", async () => {
  signOut.mockRejectedValue(new Error("network down"));
  await act(async () => root.render(createElement(SignOutButton)));
  await act(async () => button().click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("network down");
  expect(button().disabled).toBe(false);
});
