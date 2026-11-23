import type { Note } from "./notes";

export function getUniqueTags(notes: Note[]): string[] {
  return [...new Set(notes.map((n) => n.tag).filter(Boolean))].sort();
}
