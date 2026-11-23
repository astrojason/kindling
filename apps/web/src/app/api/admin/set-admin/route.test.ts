// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getCustomClaimsAdmin, setAdminClaimAdmin, verifyIdToken } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => ({ verifyIdToken: vi.fn(), getCustomClaimsAdmin: vi.fn(), setAdminClaimAdmin: vi.fn() }));

const request = (body: unknown, authorization = "Bearer token") => new Request("http://localhost/api/admin/set-admin", { method: "POST", headers: { authorization }, body: typeof body === "string" ? body : JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "boss", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(getCustomClaimsAdmin).mockResolvedValue({});
  vi.mocked(setAdminClaimAdmin).mockResolvedValue(undefined);
});

it.each(["", "Basic token", "Bearer "])("rejects missing bearer tokens (%s)", async (h) => expect((await POST(request({ uid: "u", admin: true }, h))).status).toBe(401));

it("is for superadmins only", async () => {
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "a1", admin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  expect((await POST(request({ uid: "u", admin: true }))).status).toBe(403);
  expect(setAdminClaimAdmin).not.toHaveBeenCalled();
});

it("rejects a body that is not JSON, or has the wrong shape", async () => {
  expect((await POST(request("nope"))).status).toBe(400);
  for (const body of [{}, { uid: "", admin: true }, { uid: "u" }, { uid: "u", admin: "yes" }, { uid: 5, admin: true }]) {
    expect((await POST(request(body))).status).toBe(400);
  }
  expect(setAdminClaimAdmin).not.toHaveBeenCalled();
});

it("grants and revokes the admin claim on the named account", async () => {
  expect(await (await POST(request({ uid: "u1", admin: true }))).json()).toEqual({ ok: true, admin: true });
  expect(setAdminClaimAdmin).toHaveBeenLastCalledWith("u1", true);
  expect(await (await POST(request({ uid: "u1", admin: false }))).json()).toEqual({ ok: true, admin: false });
  expect(setAdminClaimAdmin).toHaveBeenLastCalledWith("u1", false);
});

it("will not touch a superadmin's account, or the caller's own", async () => {
  vi.mocked(getCustomClaimsAdmin).mockResolvedValue({ superadmin: true });
  const res = await POST(request({ uid: "other-boss", admin: true }));
  expect(res.status).toBe(400);
  expect((await res.json()).error).toMatch(/superadmin/i);

  vi.mocked(getCustomClaimsAdmin).mockResolvedValue({});
  expect((await POST(request({ uid: "boss", admin: true }))).status).toBe(400);
  expect(setAdminClaimAdmin).not.toHaveBeenCalled();
});

it("answers 404 for an account that does not exist", async () => {
  vi.mocked(getCustomClaimsAdmin).mockRejectedValue(Object.assign(new Error("There is no user record"), { code: "auth/user-not-found" }));
  expect((await POST(request({ uid: "ghost", admin: true }))).status).toBe(404);
});

it("returns the real reason when setting the claim fails", async () => {
  vi.mocked(setAdminClaimAdmin).mockRejectedValue(new Error("auth service unavailable"));
  const res = await POST(request({ uid: "u1", admin: true }));
  expect(res.status).toBe(502);
  expect((await res.json()).error).toContain("auth service unavailable");
});
