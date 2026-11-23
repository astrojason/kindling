import { randomUUID } from "node:crypto";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { AccessRequest } from "@/lib/auth-guard";
import { CATEGORY_KEYS, defaultWeights, type CategoryKey, type Weights } from "@/lib/categories";
import { fromFirestoreLesson, toFirestoreLesson } from "@/lib/lesson-storage";
import type { CronRunLogEntry, CronRunResult, GenerationLogEntry, GenerationSource, HistoryEntry, Lesson, PushToken, SharePreview } from "@/lib/types";
import { mergeRoleClaim } from "@/lib/claims";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (raw) {
    const serviceAccount = JSON.parse(raw);
    return initializeApp({ credential: cert(serviceAccount) });
  }

  // No explicit key (expected when deployed on Firebase's own infrastructure,
  // e.g. App Hosting/Cloud Run) — fall back to Application Default Credentials.
  return initializeApp();
}

export async function verifyIdToken(idToken: string) {
  const auth = getAuth(getAdminApp());
  return auth.verifyIdToken(idToken);
}

export async function getAccessRequestAdmin(uid: string): Promise<AccessRequest | null> {
  const snap = await getFirestore(getAdminApp()).collection("accessRequests").doc(uid).get();
  return snap.exists ? (snap.data() as AccessRequest) : null;
}

/** Whether the user has ever had a lesson generated (their history is non-empty). */
export async function hasLessonHistoryAdmin(uid: string): Promise<boolean> {
  const snap = await getFirestore(getAdminApp()).collection("users").doc(uid).collection("meta").doc("history").get();
  const entries: unknown = snap.exists ? snap.data()?.entries : null;
  return Array.isArray(entries) && entries.length > 0;
}

/** Every account currently granted app access, for jobs run without a signed-in user (e.g. the daily-lesson cron). */
export async function listGrantedUserIds(): Promise<string[]> {
  const snap = await getFirestore(getAdminApp()).collection("accessRequests").where("status", "==", "granted").get();
  return snap.docs.map((d) => d.id);
}

/**
 * Superadmins and admins reach the app through their auth claim, not a granted access request, so
 * listGrantedUserIds never includes them. Reads every Auth account, which is fine at this app's size.
 */
export async function listPrivilegedUserIds(): Promise<string[]> {
  const auth = getAuth(getAdminApp());
  const uids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    uids.push(...page.users.filter((user) => user.customClaims?.superadmin === true || user.customClaims?.admin === true).map((user) => user.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  return uids;
}

/**
 * Stamps a pending access request as announced (so admins are told once) and returns who it is, or null when
 * it is missing, no longer pending, or already announced. Done in a transaction so two calls cannot both win.
 */
export async function claimAccessNotificationAdmin(uid: string): Promise<{ displayName: string | null; email: string | null } | null> {
  const db = getFirestore(getAdminApp());
  const ref = db.collection("accessRequests").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.status !== "pending" || data.notifiedAt) return null;
    tx.update(ref, { notifiedAt: new Date().toISOString() });
    return { displayName: data.displayName ?? null, email: data.email ?? null };
  });
}

/** Undoes the announced stamp and records why, so the next time the person opens the app the announcement is tried again. */
export async function releaseAccessNotificationAdmin(uid: string, reason: string): Promise<void> {
  await getFirestore(getAdminApp()).collection("accessRequests").doc(uid).update({ notifiedAt: FieldValue.delete(), notifyError: reason });
}

/** Every account holding the `admin` claim, for the superadmin's role screen. */
export async function listAdminUserIds(): Promise<string[]> {
  const auth = getAuth(getAdminApp());
  const uids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    uids.push(...page.users.filter((user) => user.customClaims?.admin === true).map((user) => user.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  return uids;
}

/** An account's custom claims; throws (code auth/user-not-found) when the account does not exist. */
export async function getCustomClaimsAdmin(uid: string): Promise<Record<string, unknown>> {
  return (await getAuth(getAdminApp()).getUser(uid)).customClaims ?? {};
}

/** Switches the `admin` claim on or off, keeping the account's other claims. */
export async function setAdminClaimAdmin(uid: string, enabled: boolean): Promise<void> {
  const auth = getAuth(getAdminApp());
  const user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, mergeRoleClaim(user.customClaims, "admin", enabled));
}

/** Granted accounts a superadmin has paused auto generation for; the cron skips them and they keep seeing their last lesson. */
export async function listPausedUserIds(): Promise<string[]> {
  const snap = await getFirestore(getAdminApp()).collection("accessRequests")
    .where("status", "==", "granted").where("autoGeneration", "==", false).get();
  return snap.docs.map((d) => d.id);
}

export interface DailyGenerationContext {
  existingLesson: Lesson | null;
  weights: Weights;
  history: HistoryEntry[];
  selectedCategories: CategoryKey[];
}

/** Mirrors the reads useDailyLesson performs client-side, via the admin SDK for a specific user with no browser session. */
export async function getDailyGenerationContextAdmin(uid: string, date: string): Promise<DailyGenerationContext> {
  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(uid);
  const [lessonSnap, weightsSnap, historySnap, categoriesSnap] = await Promise.all([
    userRef.collection("lessons").doc(date).get(),
    userRef.collection("meta").doc("weights").get(),
    userRef.collection("meta").doc("history").get(),
    userRef.collection("meta").doc("categories").get(),
  ]);
  const selectedRaw: unknown = categoriesSnap.exists ? categoriesSnap.data()?.selected : null;
  const selected = Array.isArray(selectedRaw) ? CATEGORY_KEYS.filter((key) => selectedRaw.includes(key)) : [];
  return {
    existingLesson: lessonSnap.exists ? fromFirestoreLesson(lessonSnap.data() as Parameters<typeof fromFirestoreLesson>[0]) : null,
    weights: { ...defaultWeights(), ...(weightsSnap.exists ? (weightsSnap.data() as Partial<Weights>) : {}) },
    history: historySnap.exists ? (historySnap.data()?.entries as HistoryEntry[]) : [],
    selectedCategories: selected.length ? selected : CATEGORY_KEYS,
  };
}

/** The Discover settings on the user's own users/{uid} doc: which articles-app account to read, and the keywords to match. */
export async function getNoteSettingsAdmin(uid: string): Promise<{ articlesAppUid: string | null; interestKeywords: string[] }> {
  const snap = await getFirestore(getAdminApp()).collection("users").doc(uid).get();
  const data = snap.exists ? snap.data() ?? {} : {};
  return {
    articlesAppUid: typeof data.articlesAppUid === "string" && data.articlesAppUid ? data.articlesAppUid : null,
    interestKeywords: Array.isArray(data.interestKeywords) ? data.interestKeywords.filter((k: unknown): k is string => typeof k === "string") : [],
  };
}

/** The mobile device (if any) registered to receive a badge push when this user's lesson is ready. */
export async function getPushTokenAdmin(uid: string): Promise<PushToken | null> {
  const snap = await getFirestore(getAdminApp()).collection("users").doc(uid).collection("meta").doc("pushToken").get();
  return snap.exists ? (snap.data() as PushToken) : null;
}

/**
 * Uploads narration audio to Cloud Storage at `path` and returns a stable download URL.
 * Uses the same firebaseStorageDownloadTokens convention as the client SDK's getDownloadURL
 * (rather than a V4 signed URL) since GCS caps signed URLs at 7 days.
 */
export async function uploadLessonAudioAdmin(path: string, audio: Uint8Array): Promise<string> {
  const token = randomUUID();
  const bucket = getStorage(getAdminApp()).bucket(STORAGE_BUCKET);
  const file = bucket.file(path);
  await file.save(Buffer.from(audio), {
    contentType: "audio/mpeg",
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** Records a generation event for the admin-visible generation log (see GenerationLog). */
export async function logGenerationAdmin(
  uid: string,
  title: string,
  source: GenerationSource,
  details: { slot?: number; error?: string } = {},
): Promise<void> {
  const entry: GenerationLogEntry = { uid, title, source, createdAt: new Date().toISOString(), ...details };
  await getFirestore(getAdminApp()).collection("generationLog").add(entry);
}

/** Records a full daily-lesson cron run, including per-user failures, for the admin-visible run log (see CronRunLog). */
export async function logCronRunAdmin(date: string, stoppedForTokenLimit: boolean, results: CronRunResult[], error?: string): Promise<void> {
  const entry: CronRunLogEntry = { date, stoppedForTokenLimit, results, createdAt: new Date().toISOString(), ...(error && { error }) };
  await getFirestore(getAdminApp()).collection("cronRunLog").add(entry);
}

/** Saves a cron-generated lesson and appends it to history, mirroring setLesson + appendHistory from firestore.ts. */
export async function saveDailyLessonAdmin(
  uid: string,
  date: string,
  lesson: Lesson,
  history: HistoryEntry[]
): Promise<void> {
  const db = getFirestore(getAdminApp());
  const userRef = db.collection("users").doc(uid);
  const nextHistory = [...history, { date, category: lesson.category, title: lesson.title }].slice(-60);
  await Promise.all([
    userRef.collection("lessons").doc(date).set(toFirestoreLesson(lesson)),
    userRef.collection("meta").doc("history").set({ entries: nextHistory }),
  ]);
}

/** Title/category/sender of a share, for the invite shown to visitors who can't read the lesson itself. */
export async function getSharePreviewAdmin(id: string): Promise<SharePreview | null> {
  const snap = await getFirestore(getAdminApp()).collection("shares").doc(id).get();
  if (!snap.exists) return null;
  const { title, category, ownerName } = snap.data() as SharePreview;
  return { title, category, ownerName: ownerName ?? null };
}
