import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { verifyIdToken } from "@/lib/firebase-admin";

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("openai", () => ({ default: class OpenAI { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/firebase-admin", () => ({ getAccessRequestAdmin: vi.fn(), verifyIdToken: vi.fn() }));

function request(body: unknown = { title: "T", content: "body text" }, authorization = "Bearer token") {
  return new Request("http://localhost/api/notes/draft", { method: "POST", headers: { authorization }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
const ai = (obj: object, tokens = 120) => ({ choices: [{ message: { content: JSON.stringify(obj) } }], usage: { total_tokens: tokens } });
const draft = { tag: "physics", what_it_said: "W", why_it_matters: "Y", application: "A" };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock = vi.fn().mockResolvedValue(Response.json({ tokens: 0 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(verifyIdToken).mockResolvedValue({ uid: "me", superadmin: true } as unknown as Awaited<ReturnType<typeof verifyIdToken>>);
  mockCreate.mockResolvedValue(ai(draft));
});

describe("authorization", () => {
  it.each(["", "Basic token", "Bearer "])("rejects missing bearer tokens (%s)", async (header) => {
    expect((await POST(request(undefined, header))).status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("requires app access", async () => {
    vi.mocked(verifyIdToken).mockResolvedValue({ uid: "stranger" } as Awaited<ReturnType<typeof verifyIdToken>>);
    expect((await POST(request())).status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("validation", () => {
  it("rejects a body that is not JSON", async () => {
    const res = await POST(request("not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/json/i);
  });

  it.each([{}, { title: "T" }, { content: "c" }, { title: "T", content: "  ", summary: "" }])("requires a title and content or summary (%j)", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("falls back to the summary when there is no content", async () => {
    await POST(request({ title: "T", summary: "just a summary" }));
    expect(JSON.stringify(mockCreate.mock.calls[0][0].messages)).toContain("just a summary");
  });
});

describe("token budget", () => {
  it("stops when the daily limit is reached", async () => {
    fetchMock.mockResolvedValue(Response.json({ tokens: 9_999_999 }));
    const res = await POST(request());
    expect(res.status).toBe(429);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("fails closed, with the reason, when the tracker is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("network down");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("reports the tokens it used", async () => {
    await POST(request());
    const report = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(report![1].body)).toEqual({ tokens: 120 });
  });

  it("still returns the draft but logs when reporting the tokens fails", async () => {
    fetchMock.mockImplementation(async (_url: string, init?: { method?: string }) => (init?.method === "POST" ? new Response("no", { status: 500 }) : Response.json({ tokens: 0 })));
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("drafting", () => {
  it("returns the four draft fields", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(draft);
  });

  it("defaults the tag to an empty string when the model omits it", async () => {
    mockCreate.mockResolvedValue(ai({ what_it_said: "W", why_it_matters: "Y", application: "A" }));
    expect((await (await POST(request())).json()).tag).toBe("");
  });

  it("returns 502 with the real OpenAI error message", async () => {
    mockCreate.mockRejectedValue(new Error("insufficient_quota"));
    const res = await POST(request());
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("insufficient_quota");
    expect(console.error).toHaveBeenCalled();
  });

  it.each([
    ["no content", { choices: [{ message: { content: null } }] }],
    ["malformed JSON", { choices: [{ message: { content: "not json" } }] }],
    ["missing fields", ai({ tag: "t" })],
  ])("returns 502 when the model returns %s", async (_label, response) => {
    mockCreate.mockResolvedValue(response);
    expect((await POST(request())).status).toBe(502);
  });
});
