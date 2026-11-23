import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getBadgeCountAdmin, getPushTokenAdmin, listGrantedUserIds, listPrivilegedUserIds } from "@/lib/firebase-admin";
import { sendBadgePush } from "@/lib/push";

vi.mock("@/lib/firebase-admin", () => ({
  listGrantedUserIds: vi.fn(),
  listPrivilegedUserIds: vi.fn(),
  getPushTokenAdmin: vi.fn(),
  getBadgeCountAdmin: vi.fn(),
}));
vi.mock("@/lib/push", () => ({ sendBadgePush: vi.fn() }));

const request = (authorization = "Bearer secret") =>
  new Request("http://localhost/api/cron/refresh-badges", { method: "POST", headers: { authorization } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CRON_SECRET", "secret");
  vi.mocked(listGrantedUserIds).mockResolvedValue(["alice"]);
  vi.mocked(listPrivilegedUserIds).mockResolvedValue(["admin"]);
  vi.mocked(getPushTokenAdmin).mockImplementation(async (uid) => ({ token: `token-${uid}`, platform: "ios", updatedAt: "2026-11-01" }));
  vi.mocked(getBadgeCountAdmin).mockImplementation(async (uid) => (uid === "alice" ? 4 : 0));
  vi.mocked(sendBadgePush).mockResolvedValue(undefined);
});

it("rejects a request without the cron secret", async () => {
  const response = await POST(request("Bearer wrong"));
  expect(response.status).toBe(401);
  expect(sendBadgePush).not.toHaveBeenCalled();
});

it("sets every registered device's badge to its current count, clearing it when nothing waits", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(sendBadgePush).toHaveBeenCalledWith("token-alice", 4);
  expect(sendBadgePush).toHaveBeenCalledWith("token-admin", 0);
});

it("reports a failed push in the response instead of hiding it", async () => {
  vi.mocked(sendBadgePush).mockRejectedValueOnce(new Error("DeviceNotRegistered"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  const body = await (await POST(request())).json();
  expect(body.failures).toHaveLength(1);
  expect(body.failures[0]).toMatch(/DeviceNotRegistered/);
});
