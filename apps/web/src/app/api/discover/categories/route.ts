import { NextResponse } from "next/server";
import { getCategories } from "@/lib/discover/turso";
import { authorizeDiscover, discoverFailure } from "@/lib/discover/route-helpers";

export const dynamic = "force-dynamic";

/** The category names of the user's own articles account, offered as interest keyword suggestions. */
export async function GET(request: Request) {
  const authorized = await authorizeDiscover(request);
  if (authorized instanceof NextResponse) return authorized;
  try {
    return NextResponse.json({ categories: await getCategories(authorized.articlesAppUid) });
  } catch (err) {
    return discoverFailure(err, "loading the categories");
  }
}
