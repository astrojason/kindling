// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getNoteSettingsAdmin, verifyIdToken } from "@/lib/firebase-admin";
import { getArticleForOwner, updateArticleContent } from "@/lib/discover/turso";
import { scrapeArticleFullText } from "@/lib/discover/scrape";

vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn(), getNoteSettingsAdmin: vi.fn() }));
vi.mock("@/lib/discover/turso", async (orig) => ({ ...(await orig<typeof import("@/lib/discover/turso")>()), getArticleForOwner: vi.fn(), updateArticleContent: vi.fn() }));
vi.mock("@/lib/discover/scrape", () => ({ scrapeArticleFullText: vi.fn() }));

const request = (body: unknown, authorization = "Bearer token") => new Request("http://localhost/api/discover/ingest", { method: "POST", headers: { authorization }, body: typeof body === "string" ? body : JSON.stringify(body) });
const LONG = "Full article text about woodworking joints. ".repeat(10);
const article = (content = "") => ({ id: 5, url: "https://example.com/from-the-database", title: "T", content });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: "articles-uid", interestKeywords: [] });
  vi.mocked(getArticleForOwner).mockResolvedValue(article());
  vi.mocked(updateArticleContent).mockResolvedValue(undefined);
  vi.mocked(scrapeArticleFullText).mockResolvedValue({ text: LONG, failures: [] });
});

it("requires a bearer token and app access", async () => {
  expect((await POST(request({ articleId: 5 }, ""))).status).toBe(401);
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await POST(request({ articleId: 5 }))).status).toBe(403);
  expect(scrapeArticleFullText).not.toHaveBeenCalled();
});

it.each([{}, { articleId: "5" }, { articleId: 0 }])("requires a positive whole articleId (%j)", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
});

it("answers 404 for an article that is not the user's", async () => {
  vi.mocked(getArticleForOwner).mockResolvedValue(null);
  expect((await POST(request({ articleId: 5 }))).status).toBe(404);
  expect(scrapeArticleFullText).not.toHaveBeenCalled();
  expect(updateArticleContent).not.toHaveBeenCalled();
});

it("scrapes the URL stored on the user's own article, never one from the request, and saves the text", async () => {
  const res = await POST(request({ articleId: 5, url: "http://169.254.169.254/latest/meta-data/" }));

  expect(getArticleForOwner).toHaveBeenCalledWith("articles-uid", 5);
  expect(scrapeArticleFullText).toHaveBeenCalledWith("https://example.com/from-the-database");
  expect(updateArticleContent).toHaveBeenCalledWith("articles-uid", 5, LONG);
  expect(await res.json()).toEqual({ content: LONG, scraped: true });
});

it("reuses text that was already saved instead of scraping again", async () => {
  vi.mocked(getArticleForOwner).mockResolvedValue(article(LONG));
  const res = await POST(request({ articleId: 5 }));
  expect(scrapeArticleFullText).not.toHaveBeenCalled();
  expect(await res.json()).toEqual({ content: LONG, scraped: false });
});

it("saves pasted text without scraping", async () => {
  const res = await POST(request({ articleId: 5, pastedContent: "  my pasted article text  " }));
  expect(scrapeArticleFullText).not.toHaveBeenCalled();
  expect(updateArticleContent).toHaveBeenCalledWith("articles-uid", 5, "my pasted article text");
  expect(await res.json()).toEqual({ content: "my pasted article text", scraped: false });
});

it("refuses pasted text that is far too long", async () => {
  expect((await POST(request({ articleId: 5, pastedContent: "x".repeat(300_001) }))).status).toBe(400);
  expect(updateArticleContent).not.toHaveBeenCalled();
});

it("answers 422 with every tier's reason when scraping fails, so the client can offer pasting", async () => {
  vi.mocked(scrapeArticleFullText).mockResolvedValue({ failures: ["Direct fetch: HTTP 403", "Jina Reader: HTTP 429", "ScraperAPI: SCRAPER_API_KEY is not set"] });
  const res = await POST(request({ articleId: 5 }));
  const body = await res.json();

  expect(res.status).toBe(422);
  expect(body.failures).toHaveLength(3);
  expect(body.error).toContain("HTTP 403");
  expect(body.error).toContain("SCRAPER_API_KEY is not set");
  expect(updateArticleContent).not.toHaveBeenCalled();
});

it("returns the real reason when saving the text fails", async () => {
  vi.mocked(updateArticleContent).mockRejectedValue(new Error("database is locked"));
  const res = await POST(request({ articleId: 5 }));
  expect(res.status).toBe(502);
  expect((await res.json()).error).toContain("database is locked");
});
