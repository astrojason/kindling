import { NextResponse } from "next/server";
import { authorizeAppUser } from "@/lib/api-auth";
import { getLessonAdmin } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const UID = /^[A-Za-z0-9]{1,128}$/;
const KEY = /^\d{4}-\d{2}-\d{2}(~\d{1,2})?$/;

/** One lesson generated for someone else, for Explore's reader. Lessons aren't personal, so anyone with access may read one. */
export async function GET(request: Request, { params }: { params: Promise<{ uid: string; key: string }> }) {
  const authorized = await authorizeAppUser(request);
  if (authorized instanceof NextResponse) return authorized;
  const { uid, key } = await params;
  if (!UID.test(uid) || !KEY.test(key)) return NextResponse.json({ error: "Not a lesson address" }, { status: 400 });
  try {
    const lesson = await getLessonAdmin(uid, key);
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    return NextResponse.json(lesson);
  } catch (err) {
    console.error("explore lesson failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load the lesson" }, { status: 500 });
  }
}
