import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { notifyAdminsOfPending } from "./notify-admins";

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("asks the server to tell the admins, as the signed-in user", async () => {
  fetchMock.mockResolvedValue(Response.json({ notified: 2, failures: [] }));
  await notifyAdminsOfPending(async () => "tok");

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/access/notify");
  expect(init.method).toBe("POST");
  expect(init.headers.Authorization).toBe("Bearer tok");
});

it("logs a failure with its reason instead of throwing, since the waiting user cannot act on it", async () => {
  fetchMock.mockResolvedValue(Response.json({ error: "Could not send the push: Expo down" }, { status: 502 }));
  await expect(notifyAdminsOfPending(async () => "tok")).resolves.toBeUndefined();
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining("admins"), expect.objectContaining({ message: expect.stringContaining("Expo down") }));
});

it("logs a failure to get the token too", async () => {
  await notifyAdminsOfPending(async () => { throw new Error("no session"); });
  expect(console.error).toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});
