/** The text for a Review screen with nothing to do, or null when something is due. */
export function reviewEmptyMessage({ totalCards, dueCards, totalNotes, dueNotes }: { totalCards: number; dueCards: number; totalNotes: number; dueNotes: number }): string | null {
  if (dueCards > 0 || dueNotes > 0) return null;
  if (totalCards === 0 && totalNotes === 0) return "Finish a lesson and its quiz, or capture a note, to unlock reviews.";
  return "Nothing is due right now. Come back later.";
}
