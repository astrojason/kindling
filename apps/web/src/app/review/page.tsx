"use client";

import { AccessGate } from "@/components/AccessGate";
import { DueNotes } from "@/components/review/DueNotes";
import { PastLessons } from "@/components/review/PastLessons";
import { ReviewSession } from "@/components/review/ReviewSession";
import { LoadState, PageFrame, PANEL } from "@/components/share/PageFrame";
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
        const hasDueNotes = notes ? dueNotes(notes).length > 0 : false;
        // Only judge "nothing due" once the notes have loaded (or failed), so it never flashes while they are still coming.
        const empty = notes || notesError ? reviewEmptyMessage({ totalCards: cards.length, dueCards: due.length, totalNotes: notes?.length ?? 0, dueNotes: notes ? dueNotes(notes).length : 0 }) : null;
        return (
          <div className="lg:flex lg:flex-1 lg:flex-col">
            <h1 className="mb-4 text-2xl font-extrabold text-fg-strong lg:hidden">Review</h1>
            <div className="flex flex-col lg:grid lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
              {(hasDueNotes || notesError) && <div className={`lg:order-2 ${PANEL}`}><DueNotes notes={notes ?? []} error={notesError} /></div>}
              {due.length > 0 && <div className={`lg:order-1 ${PANEL}`}><ReviewSession uid={uid} today={today} cards={due} /></div>}
            </div>
            {empty && <p className={`py-6 text-center text-sm text-fg-muted ${PANEL}`}>{empty}</p>}
            <div className={`mt-6 border-t border-border pt-6 lg:mt-0 lg:border-t lg:pt-7 ${PANEL}`}>
              <PastLessons uid={uid} />
            </div>
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
      <PageFrame panels title="Review">{user && <Review uid={user.uid} />}</PageFrame>
    </AccessGate>
  );
}
