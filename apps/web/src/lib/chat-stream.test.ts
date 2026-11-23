import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { streamChat } from "./chat-stream";

const ctx = { what_it_said: "w", why_it_matters: "y", application: "a" };
const delta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

function sse(parts: string[], status = 200) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { for (const p of parts) c.enqueue(encoder.encode(p)); c.close(); } }), { status, headers: { "Content-Type": "text/event-stream" } });
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const run = (onText = vi.fn()) => streamChat({ token: "tok", noteContext: ctx, messages: [{ role: "user", content: "hi" }], onText });

describe("streamChat", () => {
  it("posts the note and conversation with the user's token", async () => {
    fetchMock.mockResolvedValue(sse([delta("x"), "data: [DONE]\n\n"]));
    await run();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/notes/chat");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok", "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ noteContext: ctx, messages: [{ role: "user", content: "hi" }] });
  });

  it("reports the growing text and returns the whole reply", async () => {
    fetchMock.mockResolvedValue(sse([delta("Hel"), delta("lo"), "data: [DONE]\n\n"]));
    const onText = vi.fn();

    expect(await run(onText)).toBe("Hello");
    expect(onText.mock.calls.map((c) => c[0])).toEqual(["Hel", "Hello"]);
  });

  it("copes with an event split across network chunks", async () => {
    const event = delta("split");
    fetchMock.mockResolvedValue(sse([event.slice(0, 15), event.slice(15), "data: [DONE]\n\n"]));
    expect(await run()).toBe("split");
  });

  it("ignores the usage-only chunk and blank lines", async () => {
    fetchMock.mockResolvedValue(sse([delta("a"), `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 1, completion_tokens: 2 } })}\n\n`, "\n", "data: [DONE]\n\n"]));
    expect(await run()).toBe("a");
  });

  it("throws the server's error message on a non-OK response", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: "Daily token limit reached (250,000 / 250,000)" }, { status: 429 }));
    await expect(run()).rejects.toThrow("Daily token limit reached (250,000 / 250,000)");
  });

  it("falls back to the status when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 502 }));
    await expect(run()).rejects.toThrow("HTTP 502");
  });

  it("throws the error the server sends inside the stream", async () => {
    fetchMock.mockResolvedValue(sse([delta("par"), `data: ${JSON.stringify({ error: "rate limited" })}\n\n`]));
    await expect(run()).rejects.toThrow("rate limited");
  });

  it("throws instead of ignoring a malformed chunk", async () => {
    fetchMock.mockResolvedValue(sse(["data: {not json\n\n"]));
    await expect(run()).rejects.toThrow(/malformed/i);
  });

  it("throws when the connection ends before the stream is finished", async () => {
    fetchMock.mockResolvedValue(sse([delta("half a reply")]));
    await expect(run()).rejects.toThrow(/ended unexpectedly/i);
  });

  it("throws when there is no response body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await expect(run()).rejects.toThrow(/no response body/i);
  });
});
