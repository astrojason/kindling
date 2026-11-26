// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { DiscoverArticle } from "@random-knowledge/shared/discover";
import { nowMs } from "@/lib/clock";
import { todayStr } from "@/lib/date";
import { addStats } from "@/lib/firestore";
import { DiscoverFeed } from "./DiscoverFeed";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/clock", () => ({ nowMs: vi.fn() }));
vi.mock("@/lib/firestore", () => ({ addStats: vi.fn() }));

vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: unknown; className?: string }) => createElement("a", { href, className }, children as never) }));
vi.mock("./ArticleCard", () => ({
  ArticleCard: ({ article, onDone, onOpenArticle }: { article: DiscoverArticle; onDone: (id: number) => void; onOpenArticle: () => void }) =>
    createElement(
      "div",
      { "data-article": article.id },
      article.title,
      createElement("button", { type: "button", onClick: () => onDone(article.id) }, `done ${article.id}`),
      createElement("button", { type: "button", onClick: onOpenArticle }, `open ${article.id}`),
    ),
}));

const art = (id: number, title: string): DiscoverArticle => ({ id, title, url: `https://example.com/${id}`, summary: "", readingTime: 3, keywords: [], categories: [], content: "", createdAt: 1 });

let fetchMock: Mock<(url: string, init: RequestInit) => Promise<Response>>;
let container: HTMLElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(addStats).mockReset().mockResolvedValue(undefined);
  vi.mocked(nowMs).mockReturnValue(0);
  toast.mockReset();
  fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => Response.json({ articles: [art(1, "Dovetails"), art(2, "Mortise")], categories: ["DIY", "Home"] }));
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const render = () => act(async () => root.render(createElement(DiscoverFeed, { uid: "u1", getToken: async () => "tok" })));
const titles = () => [...container.querySelectorAll("[data-article]")].map((c) => c.firstChild?.textContent);
const setValue = (el: Element, value: string) => {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  return act(async () => { el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true })); });
};
const submit = () => act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });

it("shows a spinner, then the suggested articles", async () => {
  fetchMock.mockReturnValueOnce(new Promise(() => {}));
  await render();
  expect(container.textContent).toContain("Finding articles");

  await act(async () => root.unmount());
  root = createRoot(container);
  fetchMock.mockImplementation(async () => Response.json({ articles: [art(1, "Dovetails"), art(2, "Mortise")], categories: [] }));
  await render();
  expect(titles()).toEqual(["Dovetails", "Mortise"]);
});

it("asks the feed as the signed-in user", async () => {
  await render();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/discover/feed");
  expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
});

it("searches and filters by category, asking the feed again", async () => {
  await render();
  await setValue(container.querySelector("input[aria-label='Search articles']")!, "chisel");
  await submit();
  expect(fetchMock.mock.calls.at(-1)![0]).toBe("/api/discover/feed?search=chisel");

  await setValue(container.querySelector("select[aria-label='Category']")!, "DIY");
  expect(fetchMock.mock.calls.at(-1)![0]).toBe("/api/discover/feed?search=chisel&category=DIY");
});

it("offers the categories the feed returned", async () => {
  await render();
  const options = [...container.querySelectorAll("select[aria-label='Category'] option")].map((o) => o.textContent);
  expect(options).toEqual(["All categories", "DIY", "Home"]);
});

it("removes an article once it has been skipped or turned into a note", async () => {
  await render();
  await act(async () => (([...container.querySelectorAll("button")].find((b) => b.textContent === "done 1")) as HTMLElement).click());
  expect(titles()).toEqual(["Mortise"]);
});

it("says so when no unread article matches", async () => {
  fetchMock.mockImplementation(async () => Response.json({ articles: [], categories: [] }));
  await render();
  expect(container.textContent).toContain("No unread articles match");
});

it("shows a failure in full and selectable", async () => {
  fetchMock.mockImplementation(async () => Response.json({ error: "TURSO_DATABASE_URL is not set: Discover cannot reach the articles database." }, { status: 502 }));
  await render();
  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("TURSO_DATABASE_URL is not set");
  expect(alert?.className).toContain("select-all");
});

it("links to the settings when the articles account has not been set", async () => {
  fetchMock.mockImplementation(async () => Response.json({ error: "Set your articles account in Settings before using Discover." }, { status: 400 }));
  await render();
  expect(container.querySelector("[role='alert']")?.textContent).toContain("Set your articles account in Settings");
  expect(container.querySelector("a[href='/profile']")).not.toBeNull();
});

describe("exploring time", () => {
  const setVisibility = (state: "visible" | "hidden") => {
    Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
    return act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  };
  const leave = async () => {
    await act(async () => root.unmount());
    root = createRoot(container);
  };
  const clickButton = (text: string) => act(async () => ([...container.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLElement).click());
  afterEach(() => setVisibility("visible"));

  it("counts the time spent on Explore toward today's learning time when the page is left", async () => {
    await render();
    vi.mocked(nowMs).mockReturnValue(90_000);
    await leave();
    expect(addStats).toHaveBeenCalledWith("u1", todayStr(), { seconds: 90 });
  });

  it("keeps counting while an opened article is read in another tab", async () => {
    await render();
    vi.mocked(nowMs).mockReturnValue(10_000);
    await clickButton("open 1");
    await setVisibility("hidden");
    expect(addStats).toHaveBeenLastCalledWith("u1", todayStr(), { seconds: 10 });

    vi.mocked(nowMs).mockReturnValue(310_000); // five minutes reading the article
    await setVisibility("visible");
    vi.mocked(nowMs).mockReturnValue(370_000); // a minute writing the note
    await leave();
    expect(vi.mocked(addStats).mock.calls.reduce((sum, [, , stats]) => sum + (stats.seconds ?? 0), 0)).toBe(370);
  });

  it("stops counting while the tab is hidden for anything else", async () => {
    await render();
    vi.mocked(nowMs).mockReturnValue(20_000);
    await setVisibility("hidden");
    vi.mocked(nowMs).mockReturnValue(500_000);
    await setVisibility("visible");
    vi.mocked(nowMs).mockReturnValue(510_000);
    await leave();
    expect(vi.mocked(addStats).mock.calls.map(([, , stats]) => stats.seconds)).toEqual([20, 10]);
  });

  it("counts an article read elsewhere for at most 30 minutes", async () => {
    await render();
    await clickButton("open 1");
    await setVisibility("hidden");
    vi.mocked(nowMs).mockReturnValue(5 * 60 * 60_000); // left for five hours
    await setVisibility("visible");
    await leave();
    expect(vi.mocked(addStats).mock.calls.reduce((sum, [, , stats]) => sum + (stats.seconds ?? 0), 0)).toBe(30 * 60);
  });

  it("tells the user when the time could not be recorded", async () => {
    vi.mocked(addStats).mockRejectedValue(new Error("stats down"));
    await render();
    vi.mocked(nowMs).mockReturnValue(30_000);
    await leave();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("stats down"));
  });
});
