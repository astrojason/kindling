import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { verifyIdToken } from "@/lib/firebase-admin";

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("openai", () => ({ default: class OpenAI { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn() }));

const noteContext = { what_it_said: "WHAT_TEXT", why_it_matters: "WHY_TEXT", application: "APP_TEXT" };

function request(body: unknown = { noteContext, messages: [] }, authorization = "Bearer token") {
  return new Request("http://localhost/api/notes/chat", { method: "POST", headers: { authorization }, body: typeof body === "string" ? body : JSON.stringify(body) });
}

async function* stream(chunks: object[]) {
  for (const chunk of chunks) yield chunk;
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock = vi.fn().mockResolvedValue(Response.json({ tokens: 0 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  mockCreate.mockResolvedValue(stream([{ choices: [{ delta: { content: "Hi" } }] }]));
});

describe("authorization and validation", () => {
  it.each(["", "Basic token", "Bearer "])("rejects missing bearer tokens (%s)", async (header) => {
    expect((await POST(request(undefined, header))).status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("requires app access", async () => {
    vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
    expect((await POST(request())).status).toBe(403);
  });

  it("rejects a body that is not JSON", async () => {
    expect((await POST(request("nope"))).status).toBe(400);
  });

  it.each([{ messages: [] }, {}, { noteContext: { what_it_said: "w" } }, { noteContext, messages: "x" }, { noteContext, messages: [{ role: "system", content: "x" }] }, { noteContext, messages: [{ role: "user", content: 5 }] }])(
    "rejects a malformed request (%j)",
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    },
  );

  it("rejects an oversized conversation", async () => {
    const messages = Array.from({ length: 41 }, () => ({ role: "user", content: "x" }));
    expect((await POST(request({ noteContext, messages }))).status).toBe(400);
  });
});

describe("token budget", () => {
  it("stops when the daily limit is reached", async () => {
    fetchMock.mockResolvedValue(Response.json({ tokens: 9_999_999 }));
    expect((await POST(request())).status).toBe(429);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("fails closed, with the reason, when the tracker is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("network down");
  });
});

describe("streaming", () => {
  it("sends the note and the conversation to OpenAI with a coach prompt that matches the turn", async () => {
    const messages = [{ role: "assistant", content: "Q0" }, { role: "user", content: "A0" }];
    await POST(request({ noteContext, messages }));

    const args = mockCreate.mock.calls[0][0];
    expect(args.stream).toBe(true);
    expect(args.messages[0].role).toBe("system");
    expect(args.messages[0].content).toContain("WHAT_TEXT");
    expect(args.messages[0].content).toContain("0 of 5 main questions"); // the opener is the only assistant turn so far, and is not a main question
    expect(args.messages.slice(1)).toEqual(messages);
  });

  it("streams every chunk as server-sent events and ends with [DONE]", async () => {
    mockCreate.mockResolvedValue(stream([{ choices: [{ delta: { content: "A" } }] }, { choices: [{ delta: { content: "B" } }] }]));
    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toBe(`data: ${JSON.stringify({ choices: [{ delta: { content: "A" } }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: { content: "B" } }] })}\n\ndata: [DONE]\n\n`);
  });

  it("reports the tokens from the usage chunk once the stream ends", async () => {
    mockCreate.mockResolvedValue(stream([{ choices: [{ delta: { content: "A" } }] }, { choices: [], usage: { prompt_tokens: 100, completion_tokens: 40 } }]));
    await (await POST(request())).text();

    const report = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(report![1].body)).toEqual({ tokens: 140 });
  });

  it("sends the real OpenAI error to the client, then ends the stream", async () => {
    mockCreate.mockRejectedValue(new Error("rate limited"));
    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(await res.text()).toContain(JSON.stringify({ error: "rate limited" }));
    expect(console.error).toHaveBeenCalled();
  });

  it("sends an error event when the stream breaks part-way", async () => {
    async function* broken() {
      yield { choices: [{ delta: { content: "A" } }] };
      throw new Error("connection reset");
    }
    mockCreate.mockResolvedValue(broken());
    const text = await (await POST(request())).text();

    expect(text).toContain(JSON.stringify({ error: "connection reset" }));
    expect(text).not.toContain("[DONE]");
  });
});
