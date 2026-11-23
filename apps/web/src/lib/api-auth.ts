import { NextResponse } from "next/server";
import { getAccessRequestAdmin, verifyIdToken } from "@/lib/firebase-admin";
import { canManageAccess, hasAppAccess, isSuperadmin, resolveAccess, type AccessRequest } from "@/lib/auth-guard";

type DecodedToken = Awaited<ReturnType<typeof verifyIdToken>>;

/** Verifies the Bearer ID token; otherwise returns the error response to send. */
async function verifyCaller(request: Request): Promise<NextResponse | DecodedToken> {
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }
  try {
    return await verifyIdToken(idToken);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid auth token: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 401 }
    );
  }
}

/** Verifies the Bearer ID token and that the account has app access; otherwise returns the error response to send. */
export async function authorizeAppUser(request: Request): Promise<NextResponse | { uid: string; accessRequest: AccessRequest | null }> {
  const decoded = await verifyCaller(request);
  if (decoded instanceof NextResponse) return decoded;

  const claims = { superadmin: decoded.superadmin === true, admin: decoded.admin === true };
  const accessRequest = canManageAccess(claims) ? null : await getAccessRequestAdmin(decoded.uid);
  if (!hasAppAccess(resolveAccess(decoded.uid, claims, accessRequest))) {
    return NextResponse.json({ error: "Access not granted for this account" }, { status: 403 });
  }
  return { uid: decoded.uid, accessRequest };
}

/** Verifies the Bearer ID token and that the caller is a superadmin; otherwise returns the error response to send. */
export async function authorizeSuperadmin(request: Request): Promise<NextResponse | { uid: string }> {
  const decoded = await verifyCaller(request);
  if (decoded instanceof NextResponse) return decoded;
  if (!isSuperadmin({ superadmin: decoded.superadmin === true })) {
    return NextResponse.json({ error: "Only a superadmin can do this" }, { status: 403 });
  }
  return { uid: decoded.uid };
}

/** Verifies the Bearer ID token for any signed-in account, with no access check (a new user is exactly who needs this). */
export async function authorizeSignedIn(request: Request): Promise<NextResponse | { uid: string }> {
  const decoded = await verifyCaller(request);
  if (decoded instanceof NextResponse) return decoded;
  return { uid: decoded.uid };
}
