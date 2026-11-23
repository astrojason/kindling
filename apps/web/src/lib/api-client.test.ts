import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "./api-client";

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("requestJson", () => {
  it("sends the bearer token, and a JSON content type only when there is a body", async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: 1 }));
    await requestJson("/api/x", "tok", { method: "POST", body: "{}" });
    await requestJson("/api/x", "tok");

    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: "Bearer tok", "Content-Type": "application/json" });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Authorization: "Bearer tok" });
  });

  it("returns the parsed body", async () => {
    fetchMock.mockResolvedValue(Response.json({ a: 1 }));
    expect(await requestJson("/api/x", "tok")).toEqual({ a: 1 });
  });

  it("throws the server's error message", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "Daily token limit reached" }, { status: 429 }));
    await expect(requestJson("/api/x", "tok")).rejects.toThrow("Daily token limit reached");
  });

  it("falls back to the status when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }));
    await expect(requestJson("/api/x", "tok")).rejects.toThrow("HTTP 502");
  });
});
