import { NextResponse } from "next/server";
import { markArticleRead } from "@/lib/discover/turso";
import { authorizeDiscover, discoverFailure, parseArticleId } from "@/lib/discover/route-helpers";

export const dynamic = "force-dynamic";

/** Marks one of the user's articles as read (used for both "skip" and after it becomes a note). */
export async function POST(request: Request) {
  const authorized = await authorizeDiscover(request);
  if (authorized instanceof NextResponse) return authorized;

  let body: { articleId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const articleId = parseArticleId(body.articleId);
  if (articleId === null) return NextResponse.json({ error: "articleId must be a positive whole number" }, { status: 400 });

  try {
    await markArticleRead(authorized.articlesAppUid, articleId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return discoverFailure(err, "marking an article read");
  }
}
