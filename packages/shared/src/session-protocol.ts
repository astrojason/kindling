import type { NoteMessage } from "./notes";

/** What the 1-5 rating means, lowest to highest. */
export const RATING_LABELS = ["cold", "cool", "warm", "hot", "solid"] as const;

export interface SessionReply {
  /** The coach closed the session (SESSION_COMPLETE). */
  complete: boolean;
  /** The suggested 1-5 rating, when the reply contains one. */
  rating: number | undefined;
  /** The reply as shown and stored: markers replaced by a readable "Suggested rating" line, SESSION_COMPLETE removed. */
  display: string;
}

const RATING = /(?:suggested\s+)?rating\s*:\s*([1-5])/i;
const label = (n: string) => RATING_LABELS[parseInt(n, 10) - 1];

/** Reads the recall-coach convention: a closing assessment ends with `RATING:X` and `SESSION_COMPLETE` on their own lines. */
export function parseSessionReply(text: string): SessionReply {
  const match = text.match(RATING);
  const display = text
    .replace(/\n(?:suggested\s+)?rating\s*:\s*([1-5])\s*/gi, (_, r: string) => `\n\nSuggested rating: ${label(r)}`)
    .replace(/(?:suggested\s+)?rating\s*:\s*([1-5])\s*/gi, (_, r: string) => `Suggested rating: ${label(r)}`)
    .replace(/\nSESSION_COMPLETE\s*$/i, "")
    .replace(/SESSION_COMPLETE\s*$/i, "")
    .trim();
  return { complete: /SESSION_COMPLETE/i.test(text), rating: match ? parseInt(match[1], 10) : undefined, display: display || text.trim() };
}

/** For sessions finished before the rating was stored on the session itself: read it from the last reply. */
export function ratingFromStoredReplies(messages: NoteMessage[]): number | undefined {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  const word = last?.content.match(/suggested rating:\s*(\w+)/i)?.[1];
  if (!word) return undefined;
  const digit = parseInt(word, 10);
  if (digit >= 1 && digit <= 5) return digit;
  const index = (RATING_LABELS as readonly string[]).indexOf(word.toLowerCase());
  return index === -1 ? undefined : index + 1;
}
