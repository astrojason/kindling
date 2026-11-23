import { assertPublicHttpUrl } from "./url-guard";

// Full-text article scraper for Discover's promote step: a direct fetch, then Jina Reader, then ScraperAPI
// (SCRAPER_API_KEY). Every tier that fails says why; the caller gets the reasons, never a bare "null".

const MIN_CONTENT_LENGTH = 200;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

export interface ScrapeResult {
  text?: string;
  /** One line per tier that did not produce text, in the order they were tried. */
  failures: string[];
}

interface Deps {
  fetchImpl?: typeof fetch;
  assertUrl?: (url: string) => Promise<URL>;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Fetches `url`, re-checking every redirect target so a public page cannot bounce the server to an internal one. */
async function guardedFetch(url: string, init: RequestInit, { fetchImpl, assertUrl }: Required<Deps>): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const checked = await assertUrl(current);
    const res = await fetchImpl(checked.toString(), { ...init, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, checked).toString();
      continue;
    }
    return res;
  }
  throw new Error("too many redirects");
}

export async function scrapeArticleFullText(url: string, deps: Deps = {}): Promise<ScrapeResult> {
  const resolved: Required<Deps> = { fetchImpl: deps.fetchImpl ?? fetch, assertUrl: deps.assertUrl ?? ((u) => assertPublicHttpUrl(u)) };
  const failures: string[] = [];

  try {
    await resolved.assertUrl(url);
  } catch (err) {
    return { failures: [message(err)] };
  }

  const tiers: Array<{ name: string; run: () => Promise<string | null> }> = [
    {
      name: "Direct fetch",
      run: async () => {
        const res = await guardedFetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }, resolved);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return stripHtml(await res.text());
      },
    },
    {
      name: "Jina Reader",
      run: async () => {
        const res = await resolved.fetchImpl(`https://r.jina.ai/${url}`, { headers: { Accept: "text/plain", "X-Return-Format": "text" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.text()).trim();
      },
    },
    {
      name: "ScraperAPI",
      run: async () => {
        const key = process.env.SCRAPER_API_KEY;
        if (!key) throw new Error("SCRAPER_API_KEY is not set");
        const endpoint = `https://api.scraperapi.com/?api_key=${encodeURIComponent(key)}&url=${encodeURIComponent(url)}&render=true`;
        const res = await resolved.fetchImpl(endpoint, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return stripHtml(await res.text());
      },
    },
  ];

  for (const tier of tiers) {
    try {
      const text = await tier.run();
      if (text && text.length >= MIN_CONTENT_LENGTH) return { text, failures };
      failures.push(`${tier.name}: too little text (${text?.length ?? 0} characters)`);
    } catch (err) {
      failures.push(`${tier.name}: ${message(err)}`);
    }
  }
  return { failures };
}
