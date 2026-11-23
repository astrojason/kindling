// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getNoteSettingsAdmin, verifyIdToken } from "@/lib/firebase-admin";
import { getCategories, getUnreadArticlesForKeywords } from "@/lib/discover/turso";

vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn(), getNoteSettingsAdmin: vi.fn() }));
vi.mock("@/lib/discover/turso", async (orig) => ({ ...(await orig<typeof import("@/lib/discover/turso")>()), getUnreadArticlesForKeywords: vi.fn(), getCategories: vi.fn() }));

const request = (query = "", authorization = "Bearer token") => new Request(`http://localhost/api/discover/feed${query}`, { headers: { authorization } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: "articles-uid", interestKeywords: ["woodworking", "astronomy"] });
  vi.mocked(getUnreadArticlesForKeywords).mockResolvedValue([]);
  vi.mocked(getCategories).mockResolvedValue(["DIY"]);
});

it.each(["", "Basic token", "Bearer "])("rejects missing bearer tokens (%s)", async (header) => {
  expect((await GET(request("", header))).status).toBe(401);
  expect(getUnreadArticlesForKeywords).not.toHaveBeenCalled();
});

it("requires app access", async () => {
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await GET(request())).status).toBe(403);
});

it("asks the user to set their articles account when none is saved", async () => {
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: null, interestKeywords: ["x"] });
  const res = await GET(request());
  expect(res.status).toBe(400);
  expect((await res.json()).error).toMatch(/settings/i);
  expect(getUnreadArticlesForKeywords).not.toHaveBeenCalled();
});

it("reads the articles account and keywords from the user's own settings, ignoring any uid in the request", async () => {
  await GET(request("?articlesAppUid=someone-else&keywords=hacking"));
  expect(getNoteSettingsAdmin).toHaveBeenCalledWith("me");
  expect(getUnreadArticlesForKeywords).toHaveBeenCalledWith("articles-uid", ["woodworking", "astronomy"], { search: undefined, category: undefined });
  expect(getCategories).toHaveBeenCalledWith("articles-uid");
});

it("passes the search and category filters through and returns the articles and categories", async () => {
  vi.mocked(getUnreadArticlesForKeywords).mockResolvedValue([{ id: 1, title: "T" } as never]);
  const res = await GET(request("?search=chisel&category=DIY"));
  expect(getUnreadArticlesForKeywords).toHaveBeenCalledWith("articles-uid", expect.any(Array), { search: "chisel", category: "DIY" });
  expect(await res.json()).toEqual({ articles: [{ id: 1, title: "T" }], categories: ["DIY"] });
});

it("returns the real reason when the articles database fails", async () => {
  vi.mocked(getUnreadArticlesForKeywords).mockRejectedValue(new Error("TURSO_DATABASE_URL is not set: Discover cannot reach the articles database."));
  const res = await GET(request());
  expect(res.status).toBe(502);
  expect((await res.json()).error).toContain("TURSO_DATABASE_URL");
  expect(console.error).toHaveBeenCalled();
});
