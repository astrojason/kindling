import { NextResponse } from "next/server";
import { authorizeSuperadmin } from "@/lib/api-auth";
import { getCustomClaimsAdmin, setAdminClaimAdmin } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/** Grants or revokes the admin claim on an account (superadmin only). The account must sign in again to feel it. */
export async function POST(request: Request) {
  const authorized = await authorizeSuperadmin(request);
  if (authorized instanceof NextResponse) return authorized;

  let body: { uid?: unknown; admin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.uid !== "string" || !body.uid || typeof body.admin !== "boolean") {
    return NextResponse.json({ error: "Send { uid: string, admin: boolean }" }, { status: 400 });
  }
  if (body.uid === authorized.uid) return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });

  try {
    const claims = await getCustomClaimsAdmin(body.uid);
    if (claims.superadmin === true) return NextResponse.json({ error: "That account is a superadmin already" }, { status: 400 });
    await setAdminClaimAdmin(body.uid, body.admin);
    return NextResponse.json({ ok: true, admin: body.admin });
  } catch (err) {
    if ((err as { code?: string }).code === "auth/user-not-found") return NextResponse.json({ error: "No account has that uid" }, { status: 404 });
    console.error("Failed to change the admin claim", err);
    return NextResponse.json({ error: `Could not change the admin role: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }
}
