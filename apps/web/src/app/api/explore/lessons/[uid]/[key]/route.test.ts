// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getLessonAdmin, verifyIdToken } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn(), getLessonAdmin: vi.fn() }));

const call = (uid: string, key: string, authorization = "Bearer token") =>
  GET(new Request(`http://localhost/api/explore/lessons/${uid}/${key}`, { headers: { authorization } }), { params: Promise.resolve({ uid, key }) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getLessonAdmin).mockResolvedValue({ title: "Tide pools" } as never);
});

it("requires sign-in and app access", async () => {
  expect((await call("ada", "2026-11-20", "")).status).toBe(401);
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await call("ada", "2026-11-20")).status).toBe(403);
});

it("returns another person's lesson, a later slot of a day included", async () => {
  const res = await call("ada", "2026-11-20~2");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ title: "Tide pools" });
  expect(getLessonAdmin).toHaveBeenCalledWith("ada", "2026-11-20~2");
});

it.each([["ada", "../meta/history"], ["../x", "2026-11-20"], ["ada", "notes"]])("refuses anything that isn't a lesson address (%s, %s)", async (uid, key) => {
  expect((await call(uid, key)).status).toBe(400);
  expect(getLessonAdmin).not.toHaveBeenCalled();
});

it("says when the lesson doesn't exist, and shows a failure in full", async () => {
  vi.mocked(getLessonAdmin).mockResolvedValueOnce(null);
  expect((await call("ada", "2026-11-20")).status).toBe(404);
  vi.mocked(getLessonAdmin).mockRejectedValueOnce(new Error("Firestore unavailable"));
  const res = await call("ada", "2026-11-20");
  expect(res.status).toBe(500);
  expect((await res.json()).error).toContain("Firestore unavailable");
});
