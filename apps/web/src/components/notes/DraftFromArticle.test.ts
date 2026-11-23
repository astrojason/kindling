// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DraftFromArticle } from "./DraftFromArticle";

let container: HTMLElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const draft = { tag: "physics", what_it_said: "W", why_it_matters: "Y", application: "A" };
const render = (onDraft = vi.fn()) => act(async () => root.render(createElement(DraftFromArticle, { getToken: async () => "tok", onDraft })));
const setValue = (el: Element, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  return act(async () => { el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const field = (label: string) => container.querySelector(`[aria-label='${label}']`)!;
const button = () => container.querySelector("button") as HTMLButtonElement;
const fill = async () => { await setValue(field("Article title"), "Black holes"); await setValue(field("Article text"), "Some long article text"); };

it("needs both a title and the article text", async () => {
  await render();
  expect(button().disabled).toBe(true);
  await setValue(field("Article title"), "T");
  expect(button().disabled).toBe(true);
  await setValue(field("Article text"), "text");
  expect(button().disabled).toBe(false);
});

it("sends the article with the user's token and hands back the draft", async () => {
  fetchMock.mockResolvedValue(Response.json(draft));
  const onDraft = vi.fn();
  await render(onDraft);
  await fill();
  await act(async () => button().click());

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/notes/draft");
  expect(init.headers.Authorization).toBe("Bearer tok");
  expect(JSON.parse(init.body)).toEqual({ title: "Black holes", content: "Some long article text" });
  expect(onDraft).toHaveBeenCalledWith({ title: "Black holes", ...draft });
});

it("shows progress and disables the button while drafting", async () => {
  let finish!: (r: Response) => void;
  fetchMock.mockReturnValue(new Promise<Response>((resolve) => { finish = resolve; }));
  await render();
  await fill();
  await act(async () => button().click());

  expect(button().disabled).toBe(true);
  expect(button().textContent).toBe("Drafting…");

  await act(async () => finish(Response.json(draft)));
  expect(button().disabled).toBe(false);
});

it("shows the server's error in full when drafting fails", async () => {
  fetchMock.mockResolvedValue(Response.json({ error: "Daily token limit reached (250,000 / 250,000)" }, { status: 429 }));
  const onDraft = vi.fn();
  await render(onDraft);
  await fill();
  await act(async () => button().click());

  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Daily token limit reached (250,000 / 250,000)");
  expect(alert?.className).toContain("select-all");
  expect(onDraft).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalled();
});
