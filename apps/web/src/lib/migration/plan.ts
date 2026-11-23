// Pure planning for the Kindling data migration (scripts/migration/migrate.mjs does the I/O).
// Everything from the two old projects is re-keyed onto the owner's single Kindling uid; other
// users' data is deliberately not migrated. No imports, so Node can load this file directly.

export type MigrationIds = {
  randomKnowledgeUid: string;
  commonBookUid: string;
  kindlingUid: string;
};

export type PlannedWrite = {
  path: string;
  data: Record<string, unknown>;
  /** Merge into an existing doc instead of replacing it. */
  merge?: boolean;
};

type Doc = Record<string, unknown>;

export type RandomKnowledgeSource = {
  /** Everything under users/{randomKnowledgeUid}, as `<collection>/<docId>` paths. */
  userDocs: { subpath: string; data: Doc }[];
  accessRequest: Doc | null;
  shares: { id: string; data: Doc }[];
  generationLog: { id: string; data: Doc }[];
};

export type CommonbookSource = {
  notes: { id: string; data: Doc }[];
  sessions: { id: string; data: Doc }[];
  stats: Doc | null;
  userDoc: Doc | null;
};

/** Device push tokens belong to the old app and Firebase project, so they are not carried over. */
const SKIPPED_USER_DOCS = new Set(["meta/pushToken"]);

function requireIds(ids: MigrationIds, needed: (keyof MigrationIds)[]) {
  for (const key of needed) {
    if (!ids[key]) throw new Error(`Missing ${key}: set it in apps/web/.env.local before migrating.`);
  }
}

export function planRandomKnowledge(ids: MigrationIds, source: RandomKnowledgeSource): PlannedWrite[] {
  requireIds(ids, ["randomKnowledgeUid", "kindlingUid"]);
  const { randomKnowledgeUid: oldUid, kindlingUid: newUid } = ids;
  const writes: PlannedWrite[] = [];

  for (const { subpath, data } of source.userDocs) {
    if (SKIPPED_USER_DOCS.has(subpath)) continue;
    writes.push({ path: `users/${newUid}/${subpath}`, data });
  }
  if (source.accessRequest) {
    writes.push({ path: `accessRequests/${newUid}`, data: { ...source.accessRequest, uid: newUid } });
  }
  for (const { id, data } of source.shares) {
    if (data.ownerUid !== oldUid) continue;
    writes.push({ path: `shares/${id}`, data: { ...data, ownerUid: newUid } });
  }
  for (const { id, data } of source.generationLog) {
    if (data.uid !== oldUid) continue;
    writes.push({ path: `generationLog/${id}`, data: { ...data, uid: newUid } });
  }
  return writes;
}

export function planCommonbook(ids: MigrationIds, source: CommonbookSource): PlannedWrite[] {
  requireIds(ids, ["commonBookUid", "kindlingUid"]);
  const base = `users/${ids.kindlingUid}`;
  const writes: PlannedWrite[] = [];

  for (const { id, data } of source.notes) writes.push({ path: `${base}/notes/${id}`, data });
  for (const { id, data } of source.sessions) writes.push({ path: `${base}/sessions/${id}`, data });
  // Not `meta/stats`: that id is already the lesson stats doc.
  if (source.stats) writes.push({ path: `${base}/notesMeta/stats`, data: source.stats });

  const settings: Doc = {};
  for (const key of ["articlesAppUid", "interestKeywords"]) {
    if (source.userDoc && source.userDoc[key] !== undefined) settings[key] = source.userDoc[key];
  }
  if (Object.keys(settings).length > 0) writes.push({ path: base, data: settings, merge: true });
  return writes;
}

/** Throws if two planned writes would overwrite each other. */
export function assertNoCollisions(writes: PlannedWrite[]) {
  const seen = new Set<string>();
  for (const { path } of writes) {
    if (seen.has(path)) throw new Error(`Two migrated documents map to the same path: ${path}`);
    seen.add(path);
  }
}
