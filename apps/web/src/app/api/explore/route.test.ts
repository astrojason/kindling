// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getNoteSettingsAdmin, listOthersSharesAdmin, verifyIdToken } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn(), getNoteSettingsAdmin: vi.fn(), listOthersSharesAdmin: vi.fn() }));

const request = (authorization = "Bearer token") => new Request("http://localhost/api/explore", { headers: { authorization } });
const shared = [{ id: "s1", title: "Tide pools", category: "nature", ownerName: "Ada", createdAt: "2026-11-20T00:00:00Z" }];

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: null, interestKeywords: [] });
  vi.mocked(listOthersSharesAdmin).mockResolvedValue([]);
});

it("rejects a missing bearer token", async () => {
  expect((await GET(request(""))).status).toBe(401);
});

it("requires app access", async () => {
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await GET(request())).status).toBe(403);
});

it("says whether the caller has an articles account, and lists other people's shared lessons, never the caller's", async () => {
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: "articles-uid", interestKeywords: [] });
  vi.mocked(listOthersSharesAdmin).mockResolvedValue(shared as never);
  const res = await GET(request());
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ hasArticles: true, shared });
  expect(listOthersSharesAdmin).toHaveBeenCalledWith("me", expect.any(Number));
});

it("reports no articles account when none is set", async () => {
  expect(await (await GET(request())).json()).toEqual({ hasArticles: false, shared: [] });
});

it("returns the real error when loading fails", async () => {
  vi.mocked(listOthersSharesAdmin).mockRejectedValue(new Error("Firestore unavailable"));
  const res = await GET(request());
  expect(res.status).toBe(500);
  expect((await res.json()).error).toContain("Firestore unavailable");
});
