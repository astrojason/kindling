// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AccessRequest } from "@/lib/auth-guard";
import { AdminAccessList } from "./AdminAccessList";

const granted: AccessRequest = { uid: "reader", email: "r@example.com", displayName: "Reader", status: "granted", firstSeenAt: "2026-09-01", lastSeenAt: "2026-09-01" };
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
const render = (props: Partial<Parameters<typeof AdminAccessList>[0]> = {}) =>
  act(async () => root.render(createElement(AdminAccessList, { requests: [granted], onGrant: vi.fn(), onRevoke: vi.fn(), onToggleAutoGeneration: vi.fn(), ...props })));
const text = (t: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(t));

it("lets a superadmin switch auto lessons, grant and revoke", async () => {
  await render();
  expect(text("Auto lessons")).toBeTruthy();
  expect(text("Revoke")).toBeTruthy();
});

it("hides the auto lessons switch from someone who may not change it, but keeps revoke", async () => {
  await render({ canChangeAutoGeneration: false });
  expect(text("Auto lessons")).toBeUndefined();
  expect(text("Revoke")).toBeTruthy();
});

it("shows no admin control unless the viewer may change roles", async () => {
  await render();
  expect(text("Make admin")).toBeUndefined();
  expect(text("Remove admin")).toBeUndefined();
});

it("offers Make admin to a granted user who is not one, and Remove admin to one who is", async () => {
  const onToggleAdmin = vi.fn();
  await render({ onToggleAdmin, adminUids: new Set() });
  await act(async () => (text("Make admin") as HTMLElement).click());
  expect(onToggleAdmin).toHaveBeenCalledWith("reader", true);

  await render({ onToggleAdmin, adminUids: new Set(["reader"]) });
  await act(async () => (text("Remove admin") as HTMLElement).click());
  expect(onToggleAdmin).toHaveBeenLastCalledWith("reader", false);
});

it("does not offer admin to someone whose access is still pending", async () => {
  await render({ requests: [{ ...granted, status: "pending" }], onToggleAdmin: vi.fn(), adminUids: new Set() });
  expect(text("Make admin")).toBeUndefined();
});

it("shows progress and locks the control while that account is being changed", async () => {
  await render({ onToggleAdmin: vi.fn(), adminUids: new Set(), busyUid: "reader" });
  const button = text("Saving…") as HTMLButtonElement;
  expect(button.disabled).toBe(true);
});

it("shows why admins could not be notified about a request that is still waiting", async () => {
  await render({ requests: [{ ...granted, status: "pending", notifyError: "No admin device is registered for push notifications yet." }] });
  const note = container.querySelector("[data-notify-error]");
  expect(note?.textContent).toContain("No admin device is registered");
  expect(note?.className).toContain("select-all");
});

it("shows no notification warning for a request nobody failed to announce", async () => {
  await render({ requests: [{ ...granted, status: "pending" }] });
  expect(container.querySelector("[data-notify-error]")).toBeNull();
});
