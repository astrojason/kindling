import { NextResponse } from "next/server";
import { authorizeAppUser } from "@/lib/api-auth";
import { getNoteSettingsAdmin, listOthersSharesAdmin } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const SHARED_LIMIT = 30;

/**
 * What Explore can show this user: whether they have an articles account (their own feed), and the lessons other
 * people have shared most recently (shown when they have no feed). With neither, the app hides Explore.
 */
export async function GET(request: Request) {
  const authorized = await authorizeAppUser(request);
  if (authorized instanceof NextResponse) return authorized;
  try {
    const [settings, shared] = await Promise.all([getNoteSettingsAdmin(authorized.uid), listOthersSharesAdmin(authorized.uid, SHARED_LIMIT)]);
    return NextResponse.json({ hasArticles: Boolean(settings.articlesAppUid), shared });
  } catch (err) {
    console.error("explore failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load Explore" }, { status: 500 });
  }
}
