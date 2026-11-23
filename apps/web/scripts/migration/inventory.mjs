#!/usr/bin/env node
// READ-ONLY inventory of the three Firebase projects involved in the Kindling migration.
// Prints collection names, document counts, and field NAMES (never values), plus Auth user
// counts by provider. Writes nothing anywhere. Run from apps/web with:
//   npm run migrate:inventory
//
// Needs FIREBASE_SERVICE_ACCOUNT_KEY (kindling), FIREBASE_SERVICE_ACCOUNT_KEY_RANDOM_KNOWLEDGE
// and FIREBASE_SERVICE_ACCOUNT_KEY_COMMON_BOOK in .env.local.
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const PROJECTS = [
  { name: "random-knowledge (source)", env: "FIREBASE_SERVICE_ACCOUNT_KEY_RANDOM_KNOWLEDGE" },
  { name: "commonbook (source)", env: "FIREBASE_SERVICE_ACCOUNT_KEY_COMMON_BOOK" },
  { name: "kindling (target)", env: "FIREBASE_SERVICE_ACCOUNT_KEY" },
];

/** Field names seen across up to `limit` docs, so optional fields still show up. */
async function fieldNames(collectionRef, limit = 25) {
  const snap = await collectionRef.limit(limit).get();
  const names = new Set();
  for (const doc of snap.docs) for (const key of Object.keys(doc.data())) names.add(key);
  return [...names].sort();
}

async function count(collectionRef) {
  return (await collectionRef.count().get()).data().count;
}

async function inventoryFirestore(db) {
  const roots = await db.listCollections();
  if (roots.length === 0) console.log("  (no Firestore collections)");
  for (const col of roots) {
    console.log(`  ${col.id}: ${await count(col)} docs; fields: ${(await fieldNames(col)).join(", ") || "-"}`);
  }

  // Per-user subcollections live under users/{uid}; tally them across all users.
  const userRefs = await db.collection("users").listDocuments();
  const subs = new Map();
  for (const userRef of userRefs) {
    for (const sub of await userRef.listCollections()) {
      const entry = subs.get(sub.id) ?? { docs: 0, users: 0, fields: new Set() };
      entry.docs += await count(sub);
      entry.users += 1;
      for (const f of await fieldNames(sub, 5)) entry.fields.add(f);
      subs.set(sub.id, entry);
    }
  }
  for (const [id, e] of [...subs].sort()) {
    console.log(`  users/*/${id}: ${e.docs} docs across ${e.users} users; fields: ${[...e.fields].sort().join(", ")}`);
  }
}

async function inventoryAuth(auth) {
  const providers = new Map();
  let total = 0;
  let claims = 0;
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      total += 1;
      if (u.customClaims && Object.keys(u.customClaims).length) claims += 1;
      for (const p of u.providerData) providers.set(p.providerId, (providers.get(p.providerId) ?? 0) + 1);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  const byProvider = [...providers].map(([id, n]) => `${id}=${n}`).join(", ") || "none";
  console.log(`  Auth users: ${total} (${byProvider}); with custom claims: ${claims}`);
}

let failed = false;
for (const { name, env } of PROJECTS) {
  console.log(`\n== ${name}`);
  const raw = process.env[env];
  if (!raw) {
    console.error(`  MISSING ${env} in .env.local`);
    failed = true;
    continue;
  }
  try {
    const app = initializeApp({ credential: cert(JSON.parse(raw)) }, name);
    console.log(`  project: ${app.options.credential.projectId ?? JSON.parse(raw).project_id}`);
    await inventoryAuth(getAuth(app));
    await inventoryFirestore(getFirestore(app));
  } catch (err) {
    console.error(`  FAILED: ${err instanceof Error ? err.stack : err}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
