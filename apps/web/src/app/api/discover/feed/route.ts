import { NextResponse } from "next/server";
import { getCategories, getUnreadArticlesForKeywords } from "@/lib/discover/turso";
import { authorizeDiscover, discoverFailure } from "@/lib/discover/route-helpers";

export const dynamic = "force-dynamic";

/** Unread articles from the user's articles library that match their interest keywords. */
export async function GET(request: Request) {
  const authorized = await authorizeDiscover(request);
  if (authorized instanceof NextResponse) return authorized;

  const params = new URL(request.url).searchParams;
  const search = params.get("search") || undefined;
  const category = params.get("category") || undefined;
  try {
    const [articles, categories] = await Promise.all([
      getUnreadArticlesForKeywords(authorized.articlesAppUid, authorized.interestKeywords, { search, category }),
      getCategories(authorized.articlesAppUid),
    ]);
    return NextResponse.json({ articles, categories });
  } catch (err) {
    return discoverFailure(err, "loading the feed");
  }
}
