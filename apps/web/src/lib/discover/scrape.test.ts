// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { scrapeArticleFullText, stripHtml } from "./scrape";
import { UnsafeUrlError } from "./url-guard";

const LONG = "A sentence about woodworking joints and how they hold together. ".repeat(6);
const page = (body: string) => `<html><head><style>p{color:red}</style><script>var x=1</script></head><body>${body}</body></html>`;
const html = (text: string) => new Response(page(`<p>${text}</p>`), { status: 200 });

const allowAll = vi.fn(async (u: string) => new URL(u));
let fetchImpl: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SCRAPER_API_KEY", "key");
  allowAll.mockImplementation(async (u: string) => new URL(u));
  fetchImpl = vi.fn();
});
const run = (url = "https://example.com/a") => scrapeArticleFullText(url, { fetchImpl: fetchImpl as never, assertUrl: allowAll as never });

describe("stripHtml", () => {
  it("drops scripts, styles and tags, decodes entities and collapses whitespace", () => {
    expect(stripHtml(page("<p>Tom &amp; Jerry   say &quot;hi&quot;</p>\n<p>it&#39;s fine</p>"))).toBe(`Tom & Jerry say "hi" it's fine`);
  });
});

describe("scrapeArticleFullText", () => {
  it("returns the page text from a direct fetch", async () => {
    fetchImpl.mockResolvedValueOnce(html(LONG));
    const result = await run();
    expect(result.text).toContain("woodworking joints");
    expect(result.failures).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to Jina Reader, then ScraperAPI, and returns the first tier that works", async () => {
    fetchImpl.mockResolvedValueOnce(new Response("nope", { status: 403 })).mockResolvedValueOnce(new Response("tiny", { status: 200 })).mockResolvedValueOnce(html(LONG));
    const result = await run();
    expect(result.text).toContain("woodworking joints");
    expect(String(fetchImpl.mock.calls[1][0])).toContain("r.jina.ai");
    expect(String(fetchImpl.mock.calls[2][0])).toContain("api.scraperapi.com");
    expect(result.failures).toEqual([expect.stringContaining("403"), expect.stringMatching(/jina.*too little text/i)]);
  });

  it("returns every tier's reason when all of them fail, instead of a bare null", async () => {
    fetchImpl.mockResolvedValueOnce(new Response("", { status: 404 })).mockRejectedValueOnce(new Error("socket hang up")).mockResolvedValueOnce(new Response("", { status: 500 }));
    const result = await run();
    expect(result.text).toBeUndefined();
    expect(result.failures).toEqual([expect.stringContaining("404"), expect.stringContaining("socket hang up"), expect.stringContaining("500")]);
  });

  it("says ScraperAPI was skipped when no key is configured", async () => {
    vi.stubEnv("SCRAPER_API_KEY", "");
    fetchImpl.mockResolvedValue(new Response("", { status: 404 }));
    const result = await run();
    expect(result.failures.at(-1)).toMatch(/SCRAPER_API_KEY is not set/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("refuses an unsafe URL before fetching anything", async () => {
    allowAll.mockRejectedValue(new UnsafeUrlError("points at an internal address"));
    const result = await run("http://169.254.169.254/");
    expect(result.text).toBeUndefined();
    expect(result.failures[0]).toMatch(/internal address/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("follows a redirect only after checking where it goes", async () => {
    allowAll.mockImplementation(async (u: string) => {
      if (u.includes("169.254")) throw new UnsafeUrlError("points at an internal address");
      return new URL(u);
    });
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "http://169.254.169.254/latest" } })).mockResolvedValue(new Response("", { status: 404 }));
    const result = await run();

    expect(result.failures[0]).toMatch(/internal address/);
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes("169.254"))).toBe(false);
  });

  it("follows a safe redirect, and gives up after too many", async () => {
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 301, headers: { Location: "https://example.com/final" } })).mockResolvedValueOnce(html(LONG));
    expect((await run()).text).toContain("woodworking");

    fetchImpl.mockReset();
    fetchImpl.mockImplementation(async () => new Response(null, { status: 302, headers: { Location: "https://example.com/loop" } }));
    expect((await run()).failures[0]).toMatch(/too many redirects/i);
  });
});
