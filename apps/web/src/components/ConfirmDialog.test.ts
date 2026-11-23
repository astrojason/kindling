// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

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

const render = (props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) =>
  act(async () => root.render(createElement(ConfirmDialog, { title: "Delete note?", message: "“Black holes” will be removed.", confirmLabel: "Delete", onConfirm: vi.fn(), onCancel: vi.fn(), ...props })));
const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;

it("names what is being deleted and offers a cancel and a confirm", async () => {
  await render();
  const dialog = container.querySelector("[role='alertdialog']");
  expect(dialog?.textContent).toContain("Delete note?");
  expect(dialog?.textContent).toContain("Black holes");
  expect(button("Cancel")).toBeTruthy();
  expect(button("Delete")).toBeTruthy();
});

it("does nothing until the user chooses", async () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  await render({ onConfirm, onCancel });
  expect(onConfirm).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
});

it("confirms and cancels on click, and cancels on Escape", async () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  await render({ onConfirm, onCancel });
  await act(async () => button("Delete").click());
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await act(async () => button("Cancel").click());
  await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
  expect(onCancel).toHaveBeenCalledTimes(2);
});

it("shows progress and locks both buttons while working", async () => {
  const onCancel = vi.fn();
  await render({ busy: true, busyLabel: "Deleting…", onCancel });
  expect(button("Deleting…").disabled).toBe(true);
  expect(button("Cancel").disabled).toBe(true);
  await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
  expect(onCancel).not.toHaveBeenCalled();
});

it("shows a failure in full and selectable", async () => {
  await render({ error: "Missing or insufficient permissions." });
  const alert = container.querySelector("pre[role='alert']");
  expect(alert?.textContent).toContain("Missing or insufficient permissions.");
  expect(alert?.className).toContain("select-all");
});
