#!/usr/bin/env node
// Copies the owner's data from the two old projects into Kindling under KINDLING_UID, and sets
// the `superadmin` claim on that user. The old projects are only read, never modified.
//
//   npm run migrate            dry run: reads everything, prints the plan, writes NOTHING
//   npm run migrate -- --apply performs the writes, then verifies them
//   npm run migrate -- --verify read-only: compares every planned document with what is in Kindling
//
// Safe to re-run: every document has a deterministic path, so a second run overwrites with the
// same content. Other users' data in the old projects is intentionally not migrated.
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { assertNoCollisions, planCommonbook, planRandomKnowledge } from "../../src/lib/migration/plan.ts";

const apply = process.argv.includes("--apply");
const verify = process.argv.includes("--verify");
// For when the commonbook project no longer exists: skips reading it and, in verify mode, its documents.
const skipCommonbook = process.argv.includes("--skip-commonbook");
const BATCH_SIZE = 400;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in apps/web/.env.local`);
  return value;
}

function connect(name, envKey) {
  return initializeApp({ credential: cert(JSON.parse(requireEnv(envKey))) }, name);
}

const ids = {
  randomKnowledgeUid: requireEnv("RANDOM_KNOWLEDGE_UID"),
  commonBookUid: requireEnv("COMMON_BOOK_UID"),
  kindlingUid: requireEnv("KINDLING_UID"),
};

const rkApp = connect("random-knowledge", "FIREBASE_SERVICE_ACCOUNT_KEY_RANDOM_KNOWLEDGE");
const cbApp = connect("commonbook", "FIREBASE_SERVICE_ACCOUNT_KEY_COMMON_BOOK");
const kApp = connect("kindling", "FIREBASE_SERVICE_ACCOUNT_KEY");
const rk = getFirestore(rkApp);
const cb = getFirestore(cbApp);
const kindling = getFirestore(kApp);

/** Every doc under a document reference, as `<collection>/<id>[/<sub>/<id>…]` paths. */
async function readTree(docRef, prefix = "") {
  const out = [];
  for (const col of await docRef.listCollections()) {
    for (const doc of (await col.get()).docs) {
      const subpath = `${prefix}${col.id}/${doc.id}`;
      out.push({ subpath, data: doc.data() });
      out.push(...(await readTree(doc.ref, `${subpath}/`)));
    }
  }
  return out;
}

const list = async (col, query = (c) => c) => (await query(col).get()).docs.map((d) => ({ id: d.id, data: d.data() }));

console.log(apply ? "== APPLY mode: writing to kindling-505ce" : verify ? "== VERIFY: read-only comparison" : "== DRY RUN: nothing will be written");

console.log("\n[1/4] Checking the Kindling user");
const auth = getAuth(kApp);
const kUser = await auth.getUser(ids.kindlingUid); // throws if the uid does not exist
console.log(`  found Kindling user (providers: ${kUser.providerData.map((p) => p.providerId).join(", ")})`);

console.log("\n[2/4] Reading the old projects");
const rkAccess = await rk.doc(`accessRequests/${ids.randomKnowledgeUid}`).get();
const rkSource = {
  userDocs: await readTree(rk.doc(`users/${ids.randomKnowledgeUid}`)),
  accessRequest: rkAccess.exists ? rkAccess.data() : null,
  shares: await list(rk.collection("shares"), (c) => c.where("ownerUid", "==", ids.randomKnowledgeUid)),
  generationLog: await list(rk.collection("generationLog"), (c) => c.where("uid", "==", ids.randomKnowledgeUid)),
};
const cbSource = skipCommonbook
  ? { notes: [], sessions: [], stats: null, userDoc: null }
  : await (async () => {
      const stats = await cb.doc("meta/stats").get();
      const userDoc = await cb.doc(`users/${ids.commonBookUid}`).get();
      return {
        notes: await list(cb.collection("notes")),
        sessions: await list(cb.collection("sessions")),
        stats: stats.exists ? stats.data() : null,
        userDoc: userDoc.exists ? userDoc.data() : null,
      };
    })();
if (skipCommonbook) console.log("  commonbook: SKIPPED (--skip-commonbook); its documents are not planned or verified");
console.log(
  `  random-knowledge: ${rkSource.userDocs.length} user docs, ${rkSource.shares.length} shares, ` +
    `${rkSource.generationLog.length} generation log entries, access request: ${rkSource.accessRequest ? "yes" : "no"}`,
);
if (!skipCommonbook) console.log(`  commonbook: ${cbSource.notes.length} notes, ${cbSource.sessions.length} sessions, stats: ${cbSource.stats ? "yes" : "no"}`);

const writes = [...planRandomKnowledge(ids, rkSource), ...planCommonbook(ids, cbSource)];
assertNoCollisions(writes);

console.log("\n[3/4] Plan");
const byGroup = new Map();
for (const w of writes) {
  const parts = w.path.split("/");
  const group = parts[0] === "users" ? `users/<kindling>/${parts[2] ?? "(user doc)"}` : parts[0];
  byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
}
for (const [group, n] of [...byGroup].sort()) console.log(`  ${String(n).padStart(4)}  ${group}`);
const existing = (await kindling.getAll(...writes.map((w) => kindling.doc(w.path)))).filter((d) => d.exists).length;
console.log(`  ${writes.length} writes in total (${existing} would overwrite documents already in Kindling)`);
console.log(`  + set the superadmin claim on the Kindling user (keeps any other claims)`);

if (verify) {
  // Plain JSON round trip so Firestore Timestamps compare by value.
  const norm = (v) => JSON.stringify(JSON.parse(JSON.stringify(v)));
  const docs = await kindling.getAll(...writes.map((w) => kindling.doc(w.path)));
  const bad = [];
  writes.forEach((w, i) => {
    const got = docs[i];
    if (!got.exists) return bad.push(`missing   ${w.path}`);
    const actual = w.merge ? Object.fromEntries(Object.keys(w.data).map((k) => [k, got.data()[k]])) : got.data();
    if (norm(actual) !== norm(w.data)) bad.push(`differs   ${w.path}`);
  });
  if (bad.length) {
    console.error(`\nVERIFY FAILED: ${bad.length} of ${writes.length} documents are missing or different`);
    for (const line of bad.slice(0, 30)) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log(`\nVERIFY OK: all ${writes.length} documents are present and identical to the source`);
  process.exit(0);
}

if (!apply) {
  console.log("\nDry run complete. Re-run with `npm run migrate -- --apply` to write.");
  process.exit(0);
}

console.log("\n[4/4] Writing");
for (let i = 0; i < writes.length; i += BATCH_SIZE) {
  const batch = kindling.batch();
  for (const w of writes.slice(i, i + BATCH_SIZE)) {
    const ref = kindling.doc(w.path);
    if (w.merge) batch.set(ref, w.data, { merge: true });
    else batch.set(ref, w.data);
  }
  await batch.commit();
  console.log(`  wrote ${Math.min(i + BATCH_SIZE, writes.length)}/${writes.length}`);
}

await auth.setCustomUserClaims(ids.kindlingUid, { ...(kUser.customClaims ?? {}), superadmin: true });
console.log("  superadmin claim set (sign out and back in for it to take effect)");

console.log("\nVerifying");
const missing = (await kindling.getAll(...writes.map((w) => kindling.doc(w.path)))).filter((d) => !d.exists);
const claims = (await auth.getUser(ids.kindlingUid)).customClaims ?? {};
if (missing.length > 0 || claims.superadmin !== true) {
  console.error(`VERIFY FAILED: ${missing.length} documents missing; superadmin claim: ${claims.superadmin === true}`);
  for (const d of missing.slice(0, 20)) console.error(`  missing ${d.ref.path}`);
  process.exit(1);
}
console.log(`  all ${writes.length} documents present; superadmin claim confirmed`);
