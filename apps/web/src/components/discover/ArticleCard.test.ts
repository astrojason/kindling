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

it("makes a note: records the read date first, then fetches the article, drafts it, and opens the draft in the form to review", async () => {
  await render();
  await click(button("Make a note"));

  expect(body(markRead)).toEqual({ articleId: 5 });
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/discover/mark-read", "/api/discover/ingest", "/api/notes/draft"]);
  expect(body(ingest)).toEqual({ articleId: 5 });
  expect(body(draftRoute)).toEqual({ title: "Dovetail joints", content: TEXT });
  expect(field("Title").value).toBe("Dovetail joints");
  expect(field("Tag").value).toBe("woodworking");
  expect(field("Source URL").value).toBe("https://example.com/dovetails");
  expect(field("What did it say?").value).toBe("Drafted what");
  expect(createNote).not.toHaveBeenCalled(); // a draft is never saved on its own
});

it("shows what step it is on while it works", async () => {
  let finishRead!: (r: Response) => void;
  markRead.mockReturnValueOnce(new Promise<Response>((resolve) => { finishRead = resolve; }));
  let finishIngest!: (r: Response) => void;
  ingest.mockReturnValueOnce(new Promise<Response>((resolve) => { finishIngest = resolve; }));
  let finishDraft!: (r: Response) => void;
  draftRoute.mockReturnValueOnce(new Promise<Response>((resolve) => { finishDraft = resolve; }));
  await render();
  await click(button("Make a note"));
  expect(button("Marking it read…").disabled).toBe(true);
  expect(button("Skip").disabled).toBe(true);

  await act(async () => finishRead(Response.json({ ok: true })));
  expect(button("Fetching the article…").disabled).toBe(true);

  await act(async () => finishIngest(Response.json({ content: TEXT, scraped: true })));
  expect(button("Drafting the note…").disabled).toBe(true);

  await act(async () => finishDraft(Response.json(draft)));
  expect(field("Title")).toBeTruthy();
});

it("saves the reviewed note with its source, counts it, and opens the note, without marking the article read again", async () => {
  await render();
  await click(button("Make a note"));
  await setValue(field("What did it say?"), "Edited by me");
  await saveForm();

  expect(createNote).toHaveBeenCalledWith("u1", { title: "Dovetail joints", tag: "woodworking", source_url: "https://example.com/dovetails", what_it_said: "Edited by me", why_it_matters: "Drafted why", application: "Drafted how" });
  expect(incrementNotesStats).toHaveBeenCalledWith("u1", { total_notes: 1 });
  expect(markRead).toHaveBeenCalledTimes(1);
  expect(toast).toHaveBeenCalledWith("Note saved.");
  expect(onDone).toHaveBeenCalledWith(5);
  expect(push).toHaveBeenCalledWith("/notes/note-1");
});

it("offers pasting when the article cannot be fetched, with every reason in full", async () => {
  ingest.mockResolvedValueOnce(Response.json({ error: "Could not fetch this article. Direct fetch: HTTP 403; Jina Reader: HTTP 429. Paste the text manually instead.", failures: ["Direct fetch: HTTP 403", "Jina Reader: HTTP 429"] }, { status: 422 }));
  await render();
  await click(button("Make a note"));

  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("Direct fetch: HTTP 403");
  expect(alert?.className).toContain("select-all");
  expect(draftRoute).not.toHaveBeenCalled();

  await setValue(field("Pasted article text"), "  The pasted article text  ");
  await click(button("Use pasted text"));
  expect(body(ingest, 1)).toEqual({ articleId: 5, pastedContent: "The pasted article text" });
  expect(markRead).toHaveBeenCalledTimes(1); // already recorded when "Make a note" was pressed
  expect(body(draftRoute)).toEqual({ title: "Dovetail joints", content: TEXT });
  expect(field("Title").value).toBe("Dovetail joints");
});

it("shows a failed draft in full and lets the user retry it", async () => {
  draftRoute.mockResolvedValueOnce(Response.json({ error: "Daily token limit reached (250,000 / 250,000)" }, { status: 429 }));
  await render();
  await click(button("Make a note"));

  expect(container.querySelector("[role='alert']")?.textContent).toContain("Daily token limit reached");
  await click(button("Retry"));
  expect(draftRoute).toHaveBeenCalledTimes(2);
  expect(field("Title").value).toBe("Dovetail joints");
});

it("shows a failure to fetch the article that is not a scrape failure, and allows another try", async () => {
  ingest.mockResolvedValueOnce(Response.json({ error: "Article 5 was not found in your library." }, { status: 404 }));
  await render();
  await click(button("Make a note"));

  expect(container.querySelector("[role='alert']")?.textContent).toContain("was not found in your library");
  expect(button("Make a note").disabled).toBe(false);
});

it("shows a failed save in the form, saves nothing else, and stays", async () => {
  vi.mocked(createNote).mockRejectedValue(new Error("Missing or insufficient permissions."));
  await render();
  await click(button("Make a note"));
  await saveForm();

  expect(container.querySelector("[role='alert']")?.textContent).toContain("Missing or insufficient permissions.");
  expect(markRead).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

it("shows a failure to record the read date in full, goes no further, and lets the user try again", async () => {
  markRead.mockResolvedValueOnce(Response.json({ error: "database is locked" }, { status: 502 }));
  await render();
  await click(button("Make a note"));

  const alert = container.querySelector("[role='alert']");
  expect(alert?.textContent).toContain("database is locked");
  expect(alert?.className).toContain("select-all");
  expect(ingest).not.toHaveBeenCalled();
  expect(button("Make a note").disabled).toBe(false);

  await click(button("Make a note"));
  expect(markRead).toHaveBeenCalledTimes(2);
  expect(field("Title").value).toBe("Dovetail joints");
});

it("reports a failed count update after saving", async () => {
  vi.mocked(incrementNotesStats).mockRejectedValue(new Error("quota exceeded"));
  await render();
  await click(button("Make a note"));
  await saveForm();

  expect(toast).toHaveBeenCalledWith(expect.stringContaining("quota exceeded"));
  expect(push).toHaveBeenCalledWith("/notes/note-1");
});
