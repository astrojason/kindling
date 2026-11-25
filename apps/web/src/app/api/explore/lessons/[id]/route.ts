import { NextResponse } from "next/server";
import { authorizeAppUser } from "@/lib/api-auth";
import { EXPLORE_ID } from "@/lib/explore-id";
import { getOthersLessonAdmin } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/** One lesson made for someone else, by its opaque Explore id, for Explore's reader. Lessons aren't personal, so anyone with access may read one. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorized = await authorizeAppUser(request);
  if (authorized instanceof NextResponse) return authorized;
  const { id } = await params;
  if (!EXPLORE_ID.test(id)) return NextResponse.json({ error: "Not a lesson id" }, { status: 400 });
  try {
    const found = await getOthersLessonAdmin(authorized.uid, id);
    if (!found) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    return NextResponse.json(found);
  } catch (err) {
    console.error("explore lesson failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load the lesson" }, { status: 500 });
  }
}
