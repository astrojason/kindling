"use client";

import { PagedLinkList } from "@/components/library/PagedLinkList";
import { LoadState } from "@/components/share/PageFrame";
import { CATEGORIES } from "@/lib/categories";
import { formatDateLabel } from "@/lib/date";
import { getHistory, getStash } from "@/lib/firestore";
import { useLoad } from "@/lib/useLoad";

const heading = "mb-3 font-heading text-lg font-bold text-fg-strong";

/** On Review, for rereading: every previous lesson (newest first), and the lessons saved from others when there are any. */
export function PastLessons({ uid }: { uid: string }) {
  const state = useLoad(`past-lessons-${uid}`, async () => {
    const [history, stash] = await Promise.all([getHistory(uid), getStash(uid)]);
    return { history: [...history].reverse(), stash };
  });

  return (
    <LoadState state={state} notFound="Could not load your previous lessons.">
      {({ history, stash }) => (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className={heading}>Previous lessons</h2>
            {history.length === 0 ? (
              <p className="text-sm text-fg-muted">Your lessons will build up here.</p>
            ) : (
              <PagedLinkList
                items={history.map((entry) => ({ key: entry.date, href: `/lesson/${entry.date}`, title: entry.title, detail: `${formatDateLabel(entry.date)} · ${CATEGORIES[entry.category]}` }))}
              />
            )}
          </section>
          {stash.length > 0 && (
            <section>
              <h2 className={heading}>Saved from others</h2>
              <PagedLinkList
                items={stash.map((entry) => ({ key: entry.id, href: `/stash/${entry.id}`, title: entry.title, detail: `${CATEGORIES[entry.category]}${entry.sharedBy ? ` · from ${entry.sharedBy}` : ""}` }))}
              />
            </section>
          )}
        </div>
      )}
    </LoadState>
  );
}
