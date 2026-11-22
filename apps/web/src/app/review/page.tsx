"use client";

import { AccessGate } from "@/components/AccessGate";
import { ReviewSession } from "@/components/review/ReviewSession";
import { LoadState, PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";
import { todayStr } from "@/lib/date";
import { dueCards } from "@/lib/srs";
import { useProgressData } from "@/lib/useProgressData";

function Review({ uid }: { uid: string }) {
  const state = useProgressData(uid);
  const today = todayStr();
  return (
    <LoadState state={state} notFound="Could not load your review cards.">
      {({ cards }) => {
        const due = dueCards(cards, today);
        return (
          <div>
            <h1 className="mb-4 text-2xl font-extrabold text-fg-strong">Review</h1>
            {due.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">
                {cards.length === 0 ? "Finish a lesson and its quiz to unlock review cards." : "Nothing is due right now. Come back later."}
              </p>
            ) : (
              <ReviewSession uid={uid} today={today} cards={due} />
            )}
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
