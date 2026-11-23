/** The Review row on Today: how many items are due (lesson cards and notes together) and a line saying which. */
export function reviewSummary({ dueCards, totalCards, dueNotes, totalNotes }: { dueCards: number; totalCards: number; dueNotes: number; totalNotes: number }): { count: number; hint: string } {
  const count = dueCards + dueNotes;
  if (count === 0) return { count, hint: totalCards === 0 && totalNotes === 0 ? "Finish a lesson or capture a note to unlock" : "Nothing due right now" };

  const parts = [
    dueCards > 0 ? `${dueCards} ${dueCards === 1 ? "card" : "cards"}` : null,
    dueNotes > 0 ? `${dueNotes} ${dueNotes === 1 ? "note" : "notes"}` : null,
  ].filter(Boolean);
  return { count, hint: `${parts.join(" and ")} due` };
}
