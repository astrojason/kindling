// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getNoteSettingsAdmin, verifyIdToken } from "@/lib/firebase-admin";
import { getCategories } from "@/lib/discover/turso";

vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn(), getNoteSettingsAdmin: vi.fn() }));
vi.mock("@/lib/discover/turso", async (orig) => ({ ...(await orig<typeof import("@/lib/discover/turso")>()), getCategories: vi.fn() }));

const request = (query = "", authorization = "Bearer token") => new Request(`http://localhost/api/discover/categories${query}`, { headers: { authorization } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: "articles-uid", interestKeywords: [] });
  vi.mocked(getCategories).mockResolvedValue(["Big Ideas Simply Explained", "DIY"]);
});

it("rejects a missing bearer token", async () => {
  expect((await GET(request("", ""))).status).toBe(401);
  expect(getCategories).not.toHaveBeenCalled();
});

it("asks the user to set their articles account when none is saved", async () => {
  vi.mocked(getNoteSettingsAdmin).mockResolvedValue({ articlesAppUid: null, interestKeywords: [] });
  expect((await GET(request())).status).toBe(400);
  expect(getCategories).not.toHaveBeenCalled();
});

it("returns the categories of the user's own articles account, ignoring any uid in the request", async () => {
  const res = await GET(request("?articlesAppUid=someone-else"));
  expect(getNoteSettingsAdmin).toHaveBeenCalledWith("me");
  expect(getCategories).toHaveBeenCalledWith("articles-uid");
  expect(await res.json()).toEqual({ categories: ["Big Ideas Simply Explained", "DIY"] });
});

it("returns the real reason when the articles database fails", async () => {
  vi.mocked(getCategories).mockRejectedValue(new Error("TURSO_DATABASE_URL is not set"));
  const res = await GET(request());
  expect(res.status).toBe(502);
  expect((await res.json()).error).toContain("TURSO_DATABASE_URL");
});
