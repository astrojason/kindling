// @vitest-environment happy-dom

import { act, createElement, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AuthClaims } from "./auth-guard";
import { usePendingRequests } from "./usePendingRequests";

const subscribe = vi.hoisted(() => vi.fn());
vi.mock("@random-knowledge/shared/pending-requests", () => ({ subscribeToPendingRequests: subscribe }));
vi.mock("@/lib/firebase", () => ({ db: {} }));

let current: ReturnType<typeof usePendingRequests>;
function Harness({ uid, claims }: { uid: string | undefined; claims: AuthClaims | null }) {
  const state = usePendingRequests(uid, claims);
  useLayoutEffect(() => { current = state; });
  return null;
}
let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  subscribe.mockReturnValue(() => {});
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const render = (uid: string | undefined, claims: AuthClaims | null) => act(async () => root.render(createElement(Harness, { uid, claims })));

it.each([{ superadmin: true }, { admin: true }])("watches for pending requests when the viewer can manage access (%j)", async (claims) => {
  subscribe.mockImplementation((_db, _uid, onCount) => { onCount(3); return () => {}; });
  await render("me", claims);
  expect(subscribe).toHaveBeenCalledWith(expect.anything(), "me", expect.any(Function), expect.any(Function));
  expect(current).toEqual({ count: 3, error: null });
});

it("does not subscribe for an ordinary user or when signed out", async () => {
  await render("me", {});
  await render("me", null);
  await render(undefined, { admin: true });
  expect(subscribe).not.toHaveBeenCalled();
  expect(current.count).toBeNull();
});

it("returns a failed subscription's message and logs it", async () => {
  subscribe.mockImplementation((_db, _uid, _onCount, onError) => { onError(new Error("Missing or insufficient permissions.")); return () => {}; });
  await render("me", { admin: true });
  expect(current.error).toBe("Missing or insufficient permissions.");
  expect(console.error).toHaveBeenCalled();
});

it("stops watching when it unmounts", async () => {
  const unsubscribe = vi.fn();
  subscribe.mockReturnValue(unsubscribe);
  await render("me", { admin: true });
  await act(async () => root.unmount());
  expect(unsubscribe).toHaveBeenCalled();
  root = createRoot(container);
});
