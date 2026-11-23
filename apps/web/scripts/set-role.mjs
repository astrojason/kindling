#!/usr/bin/env node
// Grants or revokes the `admin` or `superadmin` Firebase Auth custom claim, by email. Run with:
//   npm run grant-superadmin -- someone@example.com
//   npm run grant-admin -- someone@example.com
//   npm run revoke-admin -- someone@example.com
//
// Other claims on the account are kept. The person must sign out and back in (or wait for their ID
// token to refresh, within about an hour) for the change to take effect.
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { mergeRoleClaim } from "../src/lib/claims.ts";

const [action, role, email] = process.argv.slice(2);
if (!["grant", "revoke"].includes(action) || !["admin", "superadmin"].includes(role) || !email) {
  console.error("Usage: node scripts/set-role.mjs <grant|revoke> <admin|superadmin> <email>");
  process.exit(1);
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw) return initializeApp({ credential: cert(JSON.parse(raw)) });
  return initializeApp();
}

const auth = getAuth(getAdminApp());

let user;
try {
  user = await auth.getUserByEmail(email);
} catch (err) {
  console.error(`Failed to look up ${email}: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

const enabled = action === "grant";
await auth.setCustomUserClaims(user.uid, mergeRoleClaim(user.customClaims, role, enabled));
console.log(`${enabled ? "Granted" : "Revoked"} ${role} ${enabled ? "to" : "from"} ${email} (uid: ${user.uid}).`);
console.log("They must sign out and back in for the change to take effect.");
