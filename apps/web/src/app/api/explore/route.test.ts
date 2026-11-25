// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getNoteSettingsAdmin, listOthersLessonsAdmin, verifyIdToken } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn(), getNoteSettingsAdmin: vi.fn(), listOthersLessonsAdmin: vi.fn() }));

const request = (authorization = "Bearer token") => new Request("http://localhost/api/explore", { headers: { authorization } });
const lessons = [{ uid: "ada", key: "2026-11-20", title: "Tide pools", category: "nature" }];

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: null, interestKeywords: [] });
  vi.mocked(listOthersLessonsAdmin).mockResolvedValue([]);
});

it("rejects a missing bearer token", async () => {
  expect((await GET(request(""))).status).toBe(401);
});

it("requires app access", async () => {
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await GET(request())).status).toBe(403);
});

it("says whether the caller has an articles account, and lists the lessons generated for other people, never the caller's", async () => {
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: "articles-uid", interestKeywords: [] });
  vi.mocked(listOthersLessonsAdmin).mockResolvedValue(lessons as never);
  const res = await GET(request());
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ hasArticles: true, lessons });
  expect(listOthersLessonsAdmin).toHaveBeenCalledWith("me", expect.any(Number));
});

it("reports no articles account when none is set", async () => {
  expect(await (await GET(request())).json()).toEqual({ hasArticles: false, lessons: [] });
});

it("returns the real error when loading fails", async () => {
  vi.mocked(listOthersLessonsAdmin).mockRejectedValue(new Error("Firestore unavailable"));
  const res = await GET(request());
  expect(res.status).toBe(500);
  expect((await res.json()).error).toContain("Firestore unavailable");
});
