// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getOthersLessonAdmin, verifyIdToken } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn(), getOthersLessonAdmin: vi.fn() }));

const ID = "a".repeat(32);
const call = (id: string, authorization = "Bearer token") =>
  GET(new Request(`http://localhost/api/explore/lessons/${id}`, { headers: { authorization } }), { params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getOthersLessonAdmin).mockResolvedValue({ date: "2026-11-20", lesson: { title: "Tide pools" } } as never);
});

it("requires sign-in and app access", async () => {
  expect((await call(ID, "")).status).toBe(401);
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await call(ID)).status).toBe(403);
});

it("returns the lesson and its date for an opaque id, looked up among other people's lessons", async () => {
  const res = await call(ID);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ date: "2026-11-20", lesson: { title: "Tide pools" } });
  expect(getOthersLessonAdmin).toHaveBeenCalledWith("me", ID);
});

it.each(["ada", "2026-11-20", "A".repeat(32)])("refuses anything that isn't a lesson id (%s)", async (id) => {
  expect((await call(id)).status).toBe(400);
  expect(getOthersLessonAdmin).not.toHaveBeenCalled();
});

it("says when the lesson doesn't exist, and shows a failure in full", async () => {
  vi.mocked(getOthersLessonAdmin).mockResolvedValueOnce(null);
  expect((await call(ID)).status).toBe(404);
  vi.mocked(getOthersLessonAdmin).mockRejectedValueOnce(new Error("Firestore unavailable"));
  const res = await call(ID);
  expect(res.status).toBe(500);
  expect((await res.json()).error).toContain("Firestore unavailable");
});
