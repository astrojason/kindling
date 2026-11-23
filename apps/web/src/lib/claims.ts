export type Role = "admin" | "superadmin";

const ROLES: readonly Role[] = ["admin", "superadmin"];

/** The user's custom claims with one role switched on or off; every other claim is kept (setCustomUserClaims replaces them all). */
export function mergeRoleClaim(claims: Record<string, unknown> | null | undefined, role: Role, enabled: boolean): Record<string, unknown> {
  if (!ROLES.includes(role)) throw new Error(`Unknown role "${role}": use admin or superadmin.`);
  const next = { ...(claims ?? {}) };
  if (enabled) next[role] = true;
  else delete next[role];
  return next;
}
