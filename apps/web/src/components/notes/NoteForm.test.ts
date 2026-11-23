// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NoteForm } from "./NoteForm";

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

const full = { title: "Black holes", tag: "physics", source_url: "", what_it_said: "W", why_it_matters: "Y", application: "A" };
const render = (props: Partial<Parameters<typeof NoteForm>[0]> = {}) =>
  act(async () => root.render(createElement(NoteForm, { onSubmit: vi.fn().mockResolvedValue(undefined), onCancel: vi.fn(), ...props })));

const setValue = (el: Element, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  return act(async () => { el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const field = (label: string) => container.querySelector(`[aria-label='${label}']`) as HTMLInputElement | HTMLTextAreaElement;
const fillAll = async () => {
  await setValue(field("Title"), full.title);
  await setValue(field("Tag"), full.tag);
  await setValue(field("What did it say?"), full.what_it_said);
  await setValue(field("Why does it matter?"), full.why_it_matters);
  await setValue(field("How would you explain it?"), full.application);
};
const submit = () => act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
const submitButton = () => container.querySelector("button[type='submit']") as HTMLButtonElement;

it("starts from the given values", async () => {
  await render({ initial: full });
  expect(field("Title").value).toBe("Black holes");
  expect(field("Tag").value).toBe("physics");
});

it("will not submit with a required field empty, and says so", async () => {
  const onSubmit = vi.fn();
  await render({ onSubmit });
  await submit();
  expect(onSubmit).not.toHaveBeenCalled();
  expect(container.querySelector("[role='alert']")?.textContent).toContain("Fill in all required fields.");
});

it("submits the trimmed values", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  await render({ onSubmit });
  await fillAll();
  await submit();
  expect(onSubmit).toHaveBeenCalledWith({ ...full, source_url: null });
});

it("shows progress and disables the button while saving", async () => {
  let finish!: () => void;
  const onSubmit = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  await render({ onSubmit, submitLabel: "Save note" });
  await fillAll();
  await submit();

  expect(submitButton().disabled).toBe(true);
  expect(submitButton().textContent).toBe("Saving…");

  await act(async () => finish());
  expect(submitButton().disabled).toBe(false);
  expect(submitButton().textContent).toBe("Save note");
});

it("shows a failed save in full, selectable, and lets the user try again", async () => {
  const onSubmit = vi.fn().mockRejectedValueOnce(new Error("Missing or insufficient permissions.")).mockResolvedValue(undefined);
  await render({ onSubmit });
  await fillAll();
  await submit();

  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Missing or insufficient permissions.");
  expect(alert?.className).toContain("select-all");
  expect(submitButton().disabled).toBe(false);

  await submit();
  expect(onSubmit).toHaveBeenCalledTimes(2);
  expect(container.querySelector("[role='alert']")).toBeNull();
});

it("offers existing tags as one-tap chips", async () => {
  await render({ existingTags: ["cooking", "physics"] });
  const chip = [...container.querySelectorAll("button[type='button']")].find((b) => b.textContent === "cooking") as HTMLElement;
  await act(async () => chip.click());
  expect(field("Tag").value).toBe("cooking");
});

it("cancels", async () => {
  const onCancel = vi.fn();
  await render({ onCancel });
  await act(async () => (([...container.querySelectorAll("button[type='button']")].find((b) => b.textContent === "Cancel")) as HTMLElement).click());
  expect(onCancel).toHaveBeenCalled();
});
