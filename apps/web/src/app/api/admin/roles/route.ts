import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/api-auth";
import { listAdminUserIds } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/** Which accounts hold the admin claim (superadmin only). */
export async function GET(request: Request) {
  const authorized = await authorizeSuperadmin(request);
  if (authorized instanceof NextResponse) return authorized;
  try {
    return NextResponse.json({ admins: await listAdminUserIds() });
  } catch (err) {
    console.error("Failed to list the admins", err);
    return NextResponse.json({ error: `Could not list the admins: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }
}
