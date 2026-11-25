import { createHash } from "node:crypto";

/** What an Explore lesson id looks like: 32 lowercase hex characters. */
export const EXPLORE_ID = /^[0-9a-f]{32}$/;

/**
 * The id Explore uses for someone else's lesson, so links never carry their account id. A one-way hash of the
 * account and lesson key; the server finds the lesson by hashing the entries it already lists.
 */
export function exploreLessonId(uid: string, key: string): string {
  return createHash("sha256").update(`${uid}/${key}`).digest("hex").slice(0, 32);
}
