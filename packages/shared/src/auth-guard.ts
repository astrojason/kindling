export type AccessStatus = "pending" | "granted" | "revoked";

export interface AccessRequest {
  uid: string;
  email: string | null;
  displayName: string | null;
  status: AccessStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  grantedAt?: string;
  grantedBy?: string;
  revokedAt?: string;
  /** Set by a superadmin. Only an explicit `false` pauses nightly and on-demand generation for this user. */
  autoGeneration?: boolean;
  /** Set by the server when admins were told this request is waiting (cleared if telling them failed). */
  notifiedAt?: string;
  /** Why the last attempt to tell admins failed, for the access page. */
  notifyError?: string;
}

export type ResolvedAccess = "superadmin" | "admin" | "granted" | "pending" | "revoked" | "denied";

export interface AuthClaims {
  superadmin?: boolean;
  /** Can approve or revoke access requests, and uses the app without one; cannot do superadmin-only things. */
  admin?: boolean;
}

export function isSuperadmin(claims: AuthClaims | null | undefined): boolean {
  return claims?.superadmin === true;
}

export function isAdmin(claims: AuthClaims | null | undefined): boolean {
  return claims?.admin === true;
}

/** Who sees pending-user notifications and may approve or revoke access requests. */
export function canManageAccess(claims: AuthClaims | null | undefined): boolean {
  return isSuperadmin(claims) || isAdmin(claims);
}

export function resolveAccess(
  uid: string | null,
  claims: AuthClaims | null,
  request: AccessRequest | null
): ResolvedAccess {
  if (!uid) return "denied";
  if (isSuperadmin(claims)) return "superadmin";
  if (isAdmin(claims)) return "admin";
  if (!request) return "pending";
  return request.status;
}

export function hasAppAccess(resolved: ResolvedAccess): boolean {
  return resolved === "superadmin" || resolved === "admin" || resolved === "granted";
}

export type StartupScreen = "starting" | "sign-in" | "pending" | "revoked" | "app";

/**
 * Which screen the app shows. "starting" covers everything before the answer is known: Firebase
 * restoring the saved session, and the access check (including the render before it begins, when
 * the result is still empty). The app keeps its splash up through it, so a signed-in person never
 * glimpses the sign-in or access-pending screen on the way in.
 */
export function startupScreen({
  authLoading,
  signedIn,
  accessLoading,
  access,
}: {
  authLoading: boolean;
  signedIn: boolean;
  accessLoading: boolean;
  access: ResolvedAccess | null;
}): StartupScreen {
  if (authLoading) return "starting";
  if (!signedIn) return "sign-in";
  if (accessLoading || access === null) return "starting";
  if (hasAppAccess(access)) return "app";
  return access === "revoked" ? "revoked" : "pending";
}

/**
 * Excludes the viewer's own request from the admin list — a superadmin can
 * have a leftover accessRequests doc from before they were granted the
 * claim (their first sign-in recorded them as "pending"), which should
 * never show up as something for them to review.
 */
export function requestsForAdmin(requests: AccessRequest[], viewerUid: string): AccessRequest[] {
  return requests.filter((r) => r.uid !== viewerUid);
}
