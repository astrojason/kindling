// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi, type Mock } from "vitest";
import type { DiscoverArticle } from "@random-knowledge/shared/discover";
import { createNote, incrementNotesStats } from "@/lib/notes-firestore";
import { ArticleCard } from "./ArticleCard";

const push = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));
vi.mock("@/lib/notes-firestore", () => ({ createNote: vi.fn(), incrementNotesStats: vi.fn(), subscribeToNotes: vi.fn(() => () => {}) }));

const article: DiscoverArticle = { id: 5, title: "Dovetail joints", url: "https://example.com/dovetails", summary: "How dovetails hold.", readingTime: 6, keywords: ["woodworking"], categories: ["DIY"], content: "", createdAt: 1 };
const TEXT = "Full article text about dovetails. ".repeat(10);
const draft = { tag: "woodworking", what_it_said: "Drafted what", why_it_matters: "Drafted why", application: "Drafted how" };

type Handler = Mock<(init: RequestInit) => Promise<Response>>;
let fetchMock: Mock<(url: string, init: RequestInit) => Promise<Response>>;
let ingest: Handler;
let draftRoute: Handler;
let markRead: Handler;
let onDone: Mock<(articleId: number) => void>;
let container: HTMLElement;
let root: Root;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  ingest = vi.fn<(init: RequestInit) => Promise<Response>>(async () => Response.json({ content: TEXT, scraped: true }));
  draftRoute = vi.fn<(init: RequestInit) => Promise<Response>>(async () => Response.json(draft));
  markRead = vi.fn<(init: RequestInit) => Promise<Response>>(async () => Response.json({ ok: true }));
  fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async (url, init) => {
    if (url === "/api/discover/ingest") return ingest(init);
    if (url === "/api/notes/draft") return draftRoute(init);
    if (url === "/api/discover/mark-read") return markRead(init);
    return new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(createNote).mockResolvedValue("note-1");
  vi.mocked(incrementNotesStats).mockResolvedValue(undefined);
  onDone = vi.fn<(articleId: number) => void>();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const render = () => act(async () => root.render(createElement(ArticleCard, { article, uid: "u1", getToken: async () => "tok", onDone })));
const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;
const click = (el: Element | undefined) => act(async () => (el as HTMLElement).click());
const setValue = (el: Element, value: string) => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  return act(async () => { el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const field = (label: string) => container.querySelector(`[aria-label='${label}']`) as HTMLInputElement | HTMLTextAreaElement;
const body = (call: Handler, n = 0) => JSON.parse(String(call.mock.calls[n][0].body));
const saveForm = () => act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });

it("shows the article: a link that opens safely in a new tab, summary, reading time, keywords and categories", async () => {
  await render();
  const link = container.querySelector("a[href='https://example.com/dovetails']");
  expect(link?.textContent).toBe("Dovetail joints");
  expect(link?.getAttribute("target")).toBe("_blank");
  expect(link?.getAttribute("rel")).toMatch(/noopener/);
  for (const text of ["How dovetails hold.", "6 min", "woodworking", "DIY"]) expect(container.textContent).toContain(text);
});

it("always lays out the same five rows (title, details, summary, keywords, actions), so cards side by side line up", async () => {
  const sparse = { ...article, summary: "", keywords: [], readingTime: 0, categories: [] };
  for (const shown of [article, sparse]) {
    await act(async () => root.render(createElement(ArticleCard, { article: shown, uid: "u1", getToken: async () => "tok", onDone })));
    const card = container.querySelector("article")!;
    expect(card.children.length).toBe(5);
    // On wide screens each card takes five rows of the feed's grid and shares them with the card beside it.
    expect(card.className).toContain("lg:row-span-5");
    expect(card.className).toContain("lg:grid-rows-subgrid");
  }
});

it("skips an article: hides the card for now without recording anything", async () => {
  await render();
  await click(button("Skip"));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(onDone).toHaveBeenCalledWith(5);
});

it("marks an article as read: records it in the articles app and removes the card", async () => {
  await render();
  await click(button("Mark as read"));
  expect(body(markRead)).toEqual({ articleId: 5 });
  expect((markRead.mock.calls[0][0].headers as Record<string, string>).Authorization).toBe("Bearer tok");
  expect(onDone).toHaveBeenCalledWith(5);
});

it("shows progress while marking as read and a failure in full", async () => {
  let finish!: (r: Response) => void;
  markRead.mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve; }));
  await render();
  await click(button("Mark as read"));
  expect(button("Marking read…").disabled).toBe(true);
  expect(button("Make a note").disabled).toBe(true);
  expect(button("Skip").disabled).toBe(true);

  await act(async () => finish(Response.json({ error: "database is locked" }, { status: 502 })));
  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("database is locked");
  expect(alert?.className).toContain("select-all");
  expect(onDone).not.toHaveBeenCalled();
  expect(button("Mark as read").disabled).toBe(false);
});

const write = async () => {
  await setValue(field("What did it say?"), "What I read");
  await setValue(field("Why does it matter?"), "Why I care");
  await setValue(field("How would you explain it?"), "How I'd say it");
  await setValue(field("Tag"), "woodworking");
};

it("makes a note: opens the article in a new tab, records the read date, and opens an empty form to write the note in", async () => {
  const open = vi.fn();
  vi.stubGlobal("open", open);
  await render();
  await click(button("Make a note"));

  expect(open).toHaveBeenCalledWith("https://example.com/dovetails", "_blank", "noopener,noreferrer");
  expect(body(markRead)).toEqual({ articleId: 5 });
  expect(field("Title").value).toBe("Dovetail joints");
  expect(field("Source URL").value).toBe("https://example.com/dovetails");
  // The note is the user's own writing: nothing is fetched or drafted for them.
  expect(field("What did it say?").value).toBe("");
  expect(field("Why does it matter?").value).toBe("");
  expect(field("How would you explain it?").value).toBe("");
  expect(ingest).not.toHaveBeenCalled();
  expect(draftRoute).not.toHaveBeenCalled();
  expect(createNote).not.toHaveBeenCalled();
});

it("does not open a link that is not a web address", async () => {
  const open = vi.fn();
  vi.stubGlobal("open", open);
  await act(async () => root.render(createElement(ArticleCard, { article: { ...article, url: "javascript:alert(1)" }, uid: "u1", getToken: async () => "tok", onDone })));
  await click(button("Make a note"));
  expect(open).not.toHaveBeenCalled();
  expect(field("Title")).toBeTruthy();
});

it("shows progress while recording the read date", async () => {
  vi.stubGlobal("open", vi.fn());
  let finish!: (r: Response) => void;
  markRead.mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve; }));
  await render();
  await click(button("Make a note"));
  expect(button("Marking it read…").disabled).toBe(true);
  expect(button("Mark as read").disabled).toBe(true);
  expect(button("Skip").disabled).toBe(true);

  await act(async () => finish(Response.json({ ok: true })));
  expect(field("Title")).toBeTruthy();
});

it("saves the written note with its source, counts it, and opens the note, without marking the article read again", async () => {
  vi.stubGlobal("open", vi.fn());
  await render();
  await click(button("Make a note"));
  await write();
  await saveForm();

  expect(createNote).toHaveBeenCalledWith("u1", { title: "Dovetail joints", tag: "woodworking", source_url: "https://example.com/dovetails", what_it_said: "What I read", why_it_matters: "Why I care", application: "How I'd say it" });
  expect(incrementNotesStats).toHaveBeenCalledWith("u1", { total_notes: 1 });
  expect(markRead).toHaveBeenCalledTimes(1);
  expect(toast).toHaveBeenCalledWith("Note saved.");
  expect(onDone).toHaveBeenCalledWith(5);
  expect(push).toHaveBeenCalledWith("/notes/note-1");
});

it("cancelling the form goes back to the card, and making a note again does not record a second read", async () => {
  vi.stubGlobal("open", vi.fn());
  await render();
  await click(button("Make a note"));
  await click(button("Cancel"));
  expect(field("Title")).toBeNull();

  await click(button("Make a note"));
  expect(markRead).toHaveBeenCalledTimes(1);
  expect(field("Title")).toBeTruthy();
});

it("shows a failure to record the read date in full, opens no form, and lets the user try again", async () => {
  vi.stubGlobal("open", vi.fn());
  markRead.mockResolvedValueOnce(Response.json({ error: "database is locked" }, { status: 502 }));
  await render();
  await click(button("Make a note"));

  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("database is locked");
  expect(alert?.className).toContain("select-all");
  expect(field("Title")).toBeNull();
  expect(button("Make a note").disabled).toBe(false);

  await click(button("Make a note"));
  expect(markRead).toHaveBeenCalledTimes(2);
  expect(field("Title")).toBeTruthy();
});

it("shows a failed save in the form, saves nothing else, and stays", async () => {
  vi.stubGlobal("open", vi.fn());
  vi.mocked(createNote).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  await click(button("Make a note"));
  await write();
  await saveForm();

  expect(container.querySelector("[role='alert']")?.textContent).toContain("Missing or insufficient permissions.");
  expect(onDone).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

it("reports a failed count update after saving", async () => {
  vi.stubGlobal("open", vi.fn());
  vi.mocked(incrementNotesStats).mockRejectedValue(new Error("quota exceeded"));
  await render();
  await click(button("Make a note"));
  await write();
  await saveForm();

  expect(toast).toHaveBeenCalledWith(expect.stringContaining("quota exceeded"));
  expect(push).toHaveBeenCalledWith("/notes/note-1");
});
