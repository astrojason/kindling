import { beforeEach, expect, it, vi } from "vitest";
import { sendAlertPush, sendBadgePush } from "./push";

beforeEach(() => vi.resetAllMocks());

it("sends a silent, badge-only push to Expo's push service", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ status: "ok" }] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await sendBadgePush("ExponentPushToken[abc]", 1);

  expect(fetchMock).toHaveBeenCalledWith(
    "https://exp.host/--/api/v2/push/send",
    expect.objectContaining({ method: "POST" })
  );
  const [, init] = fetchMock.mock.calls[0];
  const [message] = JSON.parse(init.body);
  expect(message).toMatchObject({ to: "ExponentPushToken[abc]", badge: 1, _contentAvailable: true });
  expect(message.title).toBeUndefined();
  expect(message.body).toBeUndefined();
  expect(message.sound).toBeUndefined();
});

it("throws when Expo rejects the request", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad token", { status: 400 })));
  await expect(sendBadgePush("not-a-token", 1)).rejects.toThrow(/bad token/);
});

it("throws when Expo accepts the request but the ticket reports an error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ status: "error", message: "DeviceNotRegistered" }] }), { status: 200 }))
  );
  await expect(sendBadgePush("stale-token", 1)).rejects.toThrow(/DeviceNotRegistered/);
});

const ok = (n: number) => new Response(JSON.stringify({ data: Array.from({ length: n }, () => ({ status: "ok" })) }), { status: 200 });

it("sends a visible alert push to every token in one request", async () => {
  const fetchMock = vi.fn().mockResolvedValue(ok(2));
  vi.stubGlobal("fetch", fetchMock);

  const result = await sendAlertPush(["ExponentPushToken[a]", "ExponentPushToken[b]"], { title: "Someone is waiting", body: "Alex wants to join", url: "/admin/access" });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const messages = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(messages).toHaveLength(2);
  expect(messages[0]).toMatchObject({ to: "ExponentPushToken[a]", title: "Someone is waiting", body: "Alex wants to join", sound: "default", data: { url: "/admin/access" } });
  expect(result).toEqual({ sent: 2, failures: [] });
});

it("does not call Expo when there is nobody to send to", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect(await sendAlertPush([], { title: "t", body: "b", url: "/x" })).toEqual({ sent: 0, failures: [] });
  expect(fetchMock).not.toHaveBeenCalled();
});

it("reports each token Expo refused, and still counts the ones it accepted", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ status: "ok" }, { status: "error", message: "DeviceNotRegistered" }] }), { status: 200 })));
  const result = await sendAlertPush(["ExponentPushToken[a]", "ExponentPushToken[stale]"], { title: "t", body: "b", url: "/x" });
  expect(result.sent).toBe(1);
  expect(result.failures).toEqual([expect.stringContaining("DeviceNotRegistered")]);
});

it("throws when Expo rejects the whole request", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad request", { status: 400 })));
  await expect(sendAlertPush(["x"], { title: "t", body: "b", url: "/x" })).rejects.toThrow(/bad request/);
});
