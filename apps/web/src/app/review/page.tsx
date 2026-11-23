"use client";

import { AccessGate } from "@/components/AccessGate";
import { DueNotes } from "@/components/review/DueNotes";
import { ReviewSession } from "@/components/review/ReviewSession";
import { LoadState, PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";
import { todayStr } from "@/lib/date";
import { reviewEmptyMessage } from "@/lib/review-empty";
import { dueCards } from "@/lib/srs";
import { dueNotes } from "@random-knowledge/shared/notes-view";
import { useNotes } from "@/lib/useNotes";
import { useProgressData } from "@/lib/useProgressData";

function Review({ uid }: { uid: string }) {
  const state = useProgressData(uid);
  const { notes, error: notesError } = useNotes(uid);
  const today = todayStr();
  return (
    <LoadState state={state} notFound="Could not load your review cards.">
      {({ cards }) => {
        const due = dueCards(cards, today);
        // Only judge "nothing due" once the notes have loaded (or failed), so it never flashes while they are still coming.
        const empty = notes || notesError ? reviewEmptyMessage({ totalCards: cards.length, dueCards: due.length, totalNotes: notes?.length ?? 0, dueNotes: notes ? dueNotes(notes).length : 0 }) : null;
        return (
          <div>
            <h1 className="mb-4 text-2xl font-extrabold text-fg-strong">Review</h1>
            <DueNotes notes={notes ?? []} error={notesError} />
            {due.length > 0 && <ReviewSession uid={uid} today={today} cards={due} />}
            {empty && <p className="py-6 text-center text-sm text-fg-muted">{empty}</p>}
          </div>
        );
      }}
    </LoadState>
  );
}

export default function ReviewPage() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame>{user && <Review uid={user.uid} />}</PageFrame>
    </AccessGate>
  );
}
