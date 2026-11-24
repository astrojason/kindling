import type { Note } from "./notes";

export type NoteSort = "recent" | "strength" | "tag";

/** Anything with a calendar time, so the helpers work on Firestore Timestamps and on plain stand-ins alike. */
type HasDate = { toDate(): Date };

const DAY_MS = 86_400_000;

export function filterNotes(notes: Note[], { query, tag }: { query: string; tag: string }): Note[] {
  const byTag = tag === "all" ? notes : notes.filter((n) => n.tag === tag);
  const q = query.trim().toLowerCase();
  if (!q) return byTag;
  return byTag.filter((n) => n.title.toLowerCase().includes(q) || n.tag.toLowerCase().includes(q));
}

/** A sorted copy: newest first, strongest first (never-rated last), or by tag then title. */
export function sortNotes(notes: Note[], sort: NoteSort): Note[] {
  const list = [...notes];
  if (sort === "recent") list.sort((a, b) => b.created_at.toDate().getTime() - a.created_at.toDate().getTime());
  else if (sort === "strength") list.sort((a, b) => (b.last_rating ?? -1) - (a.last_rating ?? -1));
  else list.sort((a, b) => a.tag.localeCompare(b.tag) || a.title.localeCompare(b.title));
  return list;
}

/** A short age such as "today", "3d" or "2w". */
export function ageLabel(ts: HasDate, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - ts.toDate().getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function reviewedLabel(ts: HasDate | null, now: Date = new Date()): string {
  return ts ? ageLabel(ts, now) : "never";
}

/** Notes whose next review time has come, earliest first. */
export function dueNotes(notes: Note[], now: Date = new Date()): Note[] {
  return notes
    .filter((n) => n.next_review_at.toDate().getTime() <= now.getTime())
    .sort((a, b) => a.next_review_at.toDate().getTime() - b.next_review_at.toDate().getTime());
}

/** Notes still waiting for their review time, soonest first. */
export function upcomingNotes(notes: Note[], now: Date = new Date()): Note[] {
  return notes
    .filter((n) => n.next_review_at.toDate().getTime() > now.getTime())
    .sort((a, b) => a.next_review_at.toDate().getTime() - b.next_review_at.toDate().getTime());
}

/** The day a note is next due, with how far away it is: "Thursday, Nov 26 (2 days)". A note already due reads "due now". */
export function dueDateLabel(ts: HasDate, now: Date = new Date()): string {
  const date = ts.toDate();
  if (date.getTime() <= now.getTime()) return "due now";
  const days = Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
  const day = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  return `${day} (${days} ${days === 1 ? "day" : "days"})`;
}

/** When a note is next due, in words: "due now", "tomorrow", "in 3d" or "in 2w". */
export function dueLabel(ts: HasDate, now: Date = new Date()): string {
  const ms = ts.toDate().getTime() - now.getTime();
  if (ms <= 0) return "due now";
  const days = Math.ceil(ms / DAY_MS);
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days}d`;
  return `in ${Math.floor(days / 7)}w`;
}
