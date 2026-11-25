import { NextResponse } from "next/server";
import { authorizeAppUser } from "@/lib/api-auth";
import { getNoteSettingsAdmin, listOthersLessonsAdmin } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const LESSON_LIMIT = 60;

/**
 * What Explore can show this user: whether they have an articles account (their own feed), and the lessons generated
 * for everyone else (shown when they have no feed; lessons aren't personal). With neither, the app hides Explore.
 */
export async function GET(request: Request) {
  const authorized = await authorizeAppUser(request);
  if (authorized instanceof NextResponse) return authorized;
  try {
    const [settings, lessons] = await Promise.all([getNoteSettingsAdmin(authorized.uid), listOthersLessonsAdmin(authorized.uid, LESSON_LIMIT)]);
    return NextResponse.json({ hasArticles: Boolean(settings.articlesAppUid), lessons });
  } catch (err) {
    console.error("explore failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load Explore" }, { status: 500 });
  }
}
