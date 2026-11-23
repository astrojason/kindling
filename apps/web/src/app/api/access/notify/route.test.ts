// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { claimAccessNotificationAdmin, getPushTokenAdmin, listPrivilegedUserIds, releaseAccessNotificationAdmin, verifyIdToken } from "@/lib/firebase-admin";
import { sendAlertPush } from "@/lib/push";

vi.mock("@/lib/firebase-admin", () => ({
  verifyIdToken: vi.fn(), claimAccessNotificationAdmin: vi.fn(), releaseAccessNotificationAdmin: vi.fn(), listPrivilegedUserIds: vi.fn(), getPushTokenAdmin: vi.fn(),
}));
vi.mock("@/lib/push", () => ({ sendAlertPush: vi.fn() }));

const request = (authorization = "Bearer token") => new Request("http://localhost/api/access/notify", { method: "POST", headers: { authorization } });
const token = (t: string) => ({ token: t, platform: "ios" as const, updatedAt: "2026-11-22" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "newcomer" } as Awaited<ReturnType<typeof verifyIdToken>>);
  vi.mocked(claimAccessNotificationAdmin).mockResolvedValue({ displayName: "Alex", email: "alex@example.com" });
  vi.mocked(releaseAccessNotificationAdmin).mockResolvedValue(undefined);
  vi.mocked(listPrivilegedUserIds).mockResolvedValue(["boss", "helper"]);
  vi.mocked(getPushTokenAdmin).mockImplementation(async (uid) => (uid === "boss" ? token("ExponentPushToken[boss]") : token("ExponentPushToken[helper]")));
  vi.mocked(sendAlertPush).mockResolvedValue({ sent: 2, failures: [] });
});

it.each(["", "Basic token", "Bearer "])("rejects missing bearer tokens (%s)", async (h) => {
  expect((await POST(request(h))).status).toBe(401);
  expect(sendAlertPush).not.toHaveBeenCalled();
});

it("needs no app access: a brand new user is exactly who calls this", async () => {
  expect((await POST(request())).status).toBe(200);
  expect(claimAccessNotificationAdmin).toHaveBeenCalledWith("newcomer");
});

it("does nothing when the request was already announced, is not pending, or does not exist", async () => {
  vi.mocked(claimAccessNotificationAdmin).mockResolvedValue(null);
  const res = await POST(request());
  expect(await res.json()).toEqual({ notified: 0, skipped: true });
  expect(sendAlertPush).not.toHaveBeenCalled();
  expect(listPrivilegedUserIds).not.toHaveBeenCalled();
});

it("pushes to every admin and superadmin device, naming who is waiting and where to decide", async () => {
  const res = await POST(request());

  expect(sendAlertPush).toHaveBeenCalledWith(["ExponentPushToken[boss]", "ExponentPushToken[helper]"], expect.objectContaining({ title: expect.stringMatching(/waiting/i), body: expect.stringContaining("Alex"), url: "/admin/access" }));
  expect(await res.json()).toEqual({ notified: 2, failures: [] });
  expect(releaseAccessNotificationAdmin).not.toHaveBeenCalled(); // announced: stays stamped so it is not sent twice
});

it("falls back to the email when there is no display name", async () => {
  vi.mocked(claimAccessNotificationAdmin).mockResolvedValue({ displayName: null, email: "alex@example.com" });
  await POST(request());
  expect(vi.mocked(sendAlertPush).mock.calls[0][1].body).toContain("alex@example.com");
});

it("skips admins with no registered device", async () => {
  vi.mocked(getPushTokenAdmin).mockImplementation(async (uid) => (uid === "boss" ? token("ExponentPushToken[boss]") : null));
  await POST(request());
  expect(vi.mocked(sendAlertPush).mock.calls[0][0]).toEqual(["ExponentPushToken[boss]"]);
});

it("releases the stamp and records why when no admin device is registered, so the next app open tries again", async () => {
  vi.mocked(getPushTokenAdmin).mockResolvedValue(null);
  const res = await POST(request());

  expect(sendAlertPush).not.toHaveBeenCalled();
  expect(releaseAccessNotificationAdmin).toHaveBeenCalledWith("newcomer", expect.stringMatching(/no admin device/i));
  expect(await res.json()).toEqual({ notified: 0, failures: [expect.stringMatching(/no admin device/i)] });
});

it("keeps the stamp when some devices were reached, and reports the ones that were not", async () => {
  vi.mocked(sendAlertPush).mockResolvedValue({ sent: 1, failures: ["ExponentPushToken[helper]: DeviceNotRegistered"] });
  const res = await POST(request());

  expect(await res.json()).toEqual({ notified: 1, failures: ["ExponentPushToken[helper]: DeviceNotRegistered"] });
  expect(releaseAccessNotificationAdmin).not.toHaveBeenCalled();
});

it("releases the stamp and returns the real reason when every device failed", async () => {
  vi.mocked(sendAlertPush).mockResolvedValue({ sent: 0, failures: ["a: DeviceNotRegistered", "b: DeviceNotRegistered"] });
  const res = await POST(request());

  expect(releaseAccessNotificationAdmin).toHaveBeenCalledWith("newcomer", expect.stringContaining("DeviceNotRegistered"));
  expect(res.status).toBe(502);
  expect((await res.json()).error).toContain("DeviceNotRegistered");
});

it("releases the stamp and returns the reason when Expo itself fails", async () => {
  vi.mocked(sendAlertPush).mockRejectedValue(new Error("Expo push request failed: 500"));
  const res = await POST(request());

  expect(releaseAccessNotificationAdmin).toHaveBeenCalledWith("newcomer", expect.stringContaining("Expo push request failed"));
  expect(res.status).toBe(502);
  expect((await res.json()).error).toContain("Expo push request failed");
});

it("still reports the reason if even releasing the stamp fails", async () => {
  vi.mocked(sendAlertPush).mockRejectedValue(new Error("Expo down"));
  vi.mocked(releaseAccessNotificationAdmin).mockRejectedValue(new Error("firestore down"));
  const res = await POST(request());
  expect(res.status).toBe(502);
  const message = (await res.json()).error;
  expect(message).toContain("Expo down");
  expect(message).toContain("firestore down");
});
