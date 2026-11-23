import { describe, expect, it } from "vitest";
import { assertNoCollisions, planCommonbook, planRandomKnowledge, type MigrationIds } from "./plan";

const ids: MigrationIds = { randomKnowledgeUid: "rk-old", commonBookUid: "cb-old", kindlingUid: "kindling-new" };

describe("planRandomKnowledge", () => {
  it("re-keys the owner's per-user data under the Kindling uid", () => {
    const writes = planRandomKnowledge(ids, {
      userDocs: [
        { subpath: "lessons/2026-09-09", data: { title: "A" } },
        { subpath: "progress/2026-09-09", data: { done: true } },
        { subpath: "reviewCards/2026-11-22-0", data: { box: 1 } },
        { subpath: "shares/2026-09-20", data: { shareId: "s1" } },
      ],
      accessRequest: null,
      shares: [],
      generationLog: [],
    });
    expect(writes.map((w) => w.path)).toEqual([
      "users/kindling-new/lessons/2026-09-09",
      "users/kindling-new/progress/2026-09-09",
      "users/kindling-new/reviewCards/2026-11-22-0",
      "users/kindling-new/shares/2026-09-20",
    ]);
    expect(writes[0].data).toEqual({ title: "A" });
  });

  it("skips the push token, which is bound to the old app and Firebase project", () => {
    const writes = planRandomKnowledge(ids, {
      userDocs: [
        { subpath: "meta/pushToken", data: { token: "x" } },
        { subpath: "meta/streak", data: { streak: 3 } },
      ],
      accessRequest: null,
      shares: [],
      generationLog: [],
    });
    expect(writes.map((w) => w.path)).toEqual(["users/kindling-new/meta/streak"]);
  });

  it("re-keys the access request and keeps its status", () => {
    const writes = planRandomKnowledge(ids, {
      userDocs: [],
      accessRequest: { uid: "rk-old", status: "granted", email: "me@example.com" },
      shares: [],
      generationLog: [],
    });
    expect(writes).toEqual([
      { path: "accessRequests/kindling-new", data: { uid: "kindling-new", status: "granted", email: "me@example.com" } },
    ]);
  });

  it("re-keys shares owned by the owner and ignores anyone else's", () => {
    const writes = planRandomKnowledge(ids, {
      userDocs: [],
      accessRequest: null,
      shares: [
        { id: "mine", data: { ownerUid: "rk-old", title: "T" } },
        { id: "theirs", data: { ownerUid: "someone-else", title: "U" } },
      ],
      generationLog: [],
    });
    expect(writes).toEqual([{ path: "shares/mine", data: { ownerUid: "kindling-new", title: "T" } }]);
  });

  it("re-keys the owner's generation log entries and ignores anyone else's", () => {
    const writes = planRandomKnowledge(ids, {
      userDocs: [],
      accessRequest: null,
      shares: [],
      generationLog: [
        { id: "g1", data: { uid: "rk-old", source: "cron" } },
        { id: "g2", data: { uid: "someone-else", source: "cron" } },
      ],
    });
    expect(writes).toEqual([{ path: "generationLog/g1", data: { uid: "kindling-new", source: "cron" } }]);
  });

  it("refuses to run when a uid is missing", () => {
    expect(() =>
      planRandomKnowledge({ ...ids, kindlingUid: "" }, { userDocs: [], accessRequest: null, shares: [], generationLog: [] }),
    ).toThrow(/kindlingUid/);
  });
});

describe("planCommonbook", () => {
  it("moves notes, sessions and stats under the Kindling user", () => {
    const writes = planCommonbook(ids, {
      notes: [{ id: "n1", data: { title: "N", deleted_at: null } }],
      sessions: [{ id: "s1", data: { note_id: "n1", messages: [] } }],
      stats: { total_notes: 8 },
      userDoc: null,
    });
    expect(writes).toEqual([
      { path: "users/kindling-new/notes/n1", data: { title: "N", deleted_at: null } },
      { path: "users/kindling-new/sessions/s1", data: { note_id: "n1", messages: [] } },
      { path: "users/kindling-new/notesMeta/stats", data: { total_notes: 8 } },
    ]);
  });

  it("keeps commonbook stats apart from the lesson stats doc at meta/stats", () => {
    const rk = planRandomKnowledge(ids, {
      userDocs: [{ subpath: "meta/stats", data: { xp: 5 } }],
      accessRequest: null,
      shares: [],
      generationLog: [],
    });
    const cb = planCommonbook(ids, { notes: [], sessions: [], stats: { total_notes: 8 }, userDoc: null });
    expect(() => assertNoCollisions([...rk, ...cb])).not.toThrow();
  });

  it("carries over only the settings from the old user doc, not its role or identity", () => {
    const writes = planCommonbook(ids, {
      notes: [],
      sessions: [],
      stats: null,
      userDoc: {
        role: "SUPERADMIN",
        email: "me@example.com",
        displayName: "Me",
        articlesAppUid: "art-1",
        interestKeywords: ["a", "b"],
        createdAt: "t",
      },
    });
    expect(writes).toEqual([
      { path: "users/kindling-new", data: { articlesAppUid: "art-1", interestKeywords: ["a", "b"] }, merge: true },
    ]);
  });

  it("skips settings that were never set", () => {
    const writes = planCommonbook(ids, { notes: [], sessions: [], stats: null, userDoc: { role: "USER" } });
    expect(writes).toEqual([]);
  });
});

describe("assertNoCollisions", () => {
  it("throws when two writes target the same path", () => {
    expect(() =>
      assertNoCollisions([
        { path: "users/u/notes/a", data: {} },
        { path: "users/u/notes/a", data: {} },
      ]),
    ).toThrow(/users\/u\/notes\/a/);
  });
});
