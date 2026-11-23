import { NextResponse } from "next/server";
import { scrapeArticleFullText } from "@/lib/discover/scrape";
import { getArticleForOwner, updateArticleContent } from "@/lib/discover/turso";
import { authorizeDiscover, discoverFailure, parseArticleId } from "@/lib/discover/route-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN_CACHED_LENGTH = 200;
const MAX_PASTED_LENGTH = 300_000;

/**
 * Makes sure an article's full text is available for drafting: text already saved is reused, pasted text is
 * saved, otherwise the article's own stored URL is scraped (never a URL from the request). A failed scrape
 * answers 422 with every tier's reason so the client can offer pasting instead.
 */
export async function POST(request: Request) {
  const authorized = await authorizeDiscover(request);
  if (authorized instanceof NextResponse) return authorized;

  let body: { articleId?: unknown; pastedContent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const articleId = parseArticleId(body.articleId);
  if (articleId === null) return NextResponse.json({ error: "articleId must be a positive whole number" }, { status: 400 });
  const pasted = typeof body.pastedContent === "string" ? body.pastedContent.trim() : "";
  if (pasted.length > MAX_PASTED_LENGTH) return NextResponse.json({ error: `Pasted text must be at most ${MAX_PASTED_LENGTH.toLocaleString()} characters` }, { status: 400 });

  try {
    const article = await getArticleForOwner(authorized.articlesAppUid, articleId);
    if (!article) return NextResponse.json({ error: `Article ${articleId} was not found in your library.` }, { status: 404 });

    if (pasted) {
      await updateArticleContent(authorized.articlesAppUid, articleId, pasted);
      return NextResponse.json({ content: pasted, scraped: false });
    }
    if (article.content.length >= MIN_CACHED_LENGTH) return NextResponse.json({ content: article.content, scraped: false });

    const result = await scrapeArticleFullText(article.url);
    if (!result.text) {
      return NextResponse.json({ error: `Could not fetch this article. ${result.failures.join("; ")}. Paste the text manually instead.`, failures: result.failures }, { status: 422 });
    }
    await updateArticleContent(authorized.articlesAppUid, articleId, result.text);
    return NextResponse.json({ content: result.text, scraped: true });
  } catch (err) {
    return discoverFailure(err, "ingesting an article");
  }
}
