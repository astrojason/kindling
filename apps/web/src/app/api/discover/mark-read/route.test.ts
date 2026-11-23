// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getNoteSettingsAdmin, verifyIdToken } from "@/lib/firebase-admin";
import { ArticleNotFoundError, markArticleRead } from "@/lib/discover/turso";

vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn(), getNoteSettingsAdmin: vi.fn() }));
vi.mock("@/lib/discover/turso", async (orig) => ({ ...(await orig<typeof import("@/lib/discover/turso")>()), markArticleRead: vi.fn() }));

const request = (body: unknown, authorization = "Bearer token") => new Request("http://localhost/api/discover/mark-read", { method: "POST", headers: { authorization }, body: typeof body === "string" ? body : JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: "articles-uid", interestKeywords: [] });
  vi.mocked(markArticleRead).mockResolvedValue(undefined);
});

it("requires a bearer token and app access", async () => {
  expect((await POST(request({ articleId: 1 }, ""))).status).toBe(401);
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await POST(request({ articleId: 1 }))).status).toBe(403);
  expect(markArticleRead).not.toHaveBeenCalled();
});

it("rejects a body that is not JSON", async () => {
  expect((await POST(request("nope"))).status).toBe(400);
});

it.each([{}, { articleId: "5" }, { articleId: 0 }, { articleId: -3 }, { articleId: 1.5 }, { articleId: null }])("requires a positive whole articleId (%j)", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(markArticleRead).not.toHaveBeenCalled();
});

it("marks the article read for the articles account in the user's own settings, ignoring any uid in the body", async () => {
  const res = await POST(request({ articleId: 5, articlesAppUid: "someone-else" }));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(markArticleRead).toHaveBeenCalledWith("articles-uid", 5);
});

it("answers 404 for an article that is not theirs", async () => {
  vi.mocked(markArticleRead).mockRejectedValue(new ArticleNotFoundError(5));
  const res = await POST(request({ articleId: 5 }));
  expect(res.status).toBe(404);
  expect((await res.json()).error).toContain("5");
});

it("asks for the articles account to be set first", async () => {
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: null, interestKeywords: [] });
  expect((await POST(request({ articleId: 5 }))).status).toBe(400);
});

it("returns the real reason for any other failure", async () => {
  vi.mocked(markArticleRead).mockRejectedValue(new Error("database is locked"));
  const res = await POST(request({ articleId: 5 }));
  expect(res.status).toBe(502);
  expect((await res.json()).error).toContain("database is locked");
});
