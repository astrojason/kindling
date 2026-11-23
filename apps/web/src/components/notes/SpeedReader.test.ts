// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SpeedReader } from "./SpeedReader";

let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const render = (text: string, onClose = vi.fn()) => act(async () => root.render(createElement(SpeedReader, { text, onClose })));
const word = () => container.querySelector("[data-testid='rsvp-word']")?.textContent;
const key = (k: string) => act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: k })); });
const advance = (ms: number) => act(async () => { vi.advanceTimersByTime(ms); });
const button = (label: string) => container.querySelector(`button[aria-label='${label}']`) as HTMLElement;

it("shows the first word, paused, at 0% and the default 300 WPM", async () => {
  await render("alpha beta gamma delta");
  expect(word()).toBe("alpha");
  expect(container.textContent).toContain("300 WPM");
  expect(container.textContent).toContain("0%");
});

it("advances one word per 60000/wpm ms once playing", async () => {
  await render("alpha beta gamma delta");
  await key(" ");
  await advance(200);
  expect(word()).toBe("beta");
  await advance(200);
  expect(word()).toBe("gamma");
  expect(container.textContent).toContain("67%");
});

it("pauses on Space and restarts on R", async () => {
  await render("alpha beta gamma delta");
  await key(" ");
  await advance(200);
  await key(" ");
  await advance(1000);
  expect(word()).toBe("beta");
  await key("r");
  expect(word()).toBe("alpha");
});

it("stops on the last word at 100%", async () => {
  await render("alpha beta");
  await key(" ");
  await advance(2000);
  expect(word()).toBe("beta");
  expect(container.textContent).toContain("100%");
});

it("changes speed with the WPM buttons", async () => {
  await render("alpha beta");
  await act(async () => button("faster").click());
  expect(container.textContent).toContain("325 WPM");
  await act(async () => button("slower").click());
  await act(async () => button("slower").click());
  expect(container.textContent).toContain("275 WPM");
});

it("closes on Escape and on the close button", async () => {
  const onClose = vi.fn();
  await render("alpha", onClose);
  await key("Escape");
  await act(async () => button("close").click());
  expect(onClose).toHaveBeenCalledTimes(2);
});

it("says so when there is nothing to read", async () => {
  await render("   ");
  expect(container.textContent).toContain("Nothing to read.");
});
