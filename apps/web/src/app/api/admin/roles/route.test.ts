// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { listAdminUserIds, verifyIdToken } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => ({ verifyIdToken: vi.fn(), listAdminUserIds: vi.fn() }));

const request = (authorization = "Bearer token") => new Request("http://localhost/api/admin/roles", { headers: { authorization } });
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "boss", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(listAdminUserIds).mockResolvedValue(["a1", "a2"]);
});

it.each(["", "Basic token", "Bearer "])("rejects missing bearer tokens (%s)", async (h) => expect((await GET(request(h))).status).toBe(401));

it("rejects an invalid token", async () => {
  vi.mocked(verifyIdToken).mockRejectedValue(new Error("expired"));
  expect((await GET(request())).status).toBe(401);
});

it("is for superadmins only: an admin or an ordinary user is refused", async () => {
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "a1", admin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await GET(request())).status).toBe(403);
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "x" } as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await GET(request())).status).toBe(403);
  expect(listAdminUserIds).not.toHaveBeenCalled();
});

it("lists the uids that hold the admin claim", async () => {
  const res = await GET(request());
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ admins: ["a1", "a2"] });
});

it("returns the real reason when listing fails", async () => {
  vi.mocked(listAdminUserIds).mockRejectedValue(new Error("auth service unavailable"));
  const res = await GET(request());
  expect(res.status).toBe(502);
  expect((await res.json()).error).toContain("auth service unavailable");
});
