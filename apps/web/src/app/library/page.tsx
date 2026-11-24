"use client";

import { AccessGate } from "@/components/AccessGate";
import { PagedLinkList } from "@/components/library/PagedLinkList";
import { LoadState, PageFrame, PANEL } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES } from "@/lib/categories";
import { formatDateLabel } from "@/lib/date";
import { getHistory, getStash } from "@/lib/firestore";
import { useLoad } from "@/lib/useLoad";

function Library({ uid }: { uid: string }) {
  const state = useLoad(`library-${uid}`, async () => {
    const [history, stash] = await Promise.all([getHistory(uid), getStash(uid)]);
    return { history: [...history].reverse(), stash };
  });

  return (
    <LoadState state={state} notFound="Nothing here yet.">
      {({ history, stash }) => (
        <div className="lg:grid lg:flex-1 lg:grid-cols-2 lg:items-stretch">
          <section className={PANEL}>
          <h1 className="mb-3 font-heading text-xl font-bold text-fg-strong">Shared with you</h1>
          {stash.length === 0 ? (
            <p className="mb-6 text-sm text-fg-muted">Lessons friends share with you, and that you add to your stash, appear here.</p>
          ) : (
            <div className="mb-6">
              <PagedLinkList
                items={stash.map((entry) => ({
                  key: entry.id,
                  href: `/stash/${entry.id}`,
                  title: entry.title,
                  detail: `${CATEGORIES[entry.category]}${entry.sharedBy ? ` · from ${entry.sharedBy}` : ""}`,
                }))}
              />
            </div>
          )}
          </section>
          <section className={PANEL}>
          <h1 className="mb-3 font-heading text-xl font-bold text-fg-strong">Your past lessons</h1>
          {history.length === 0 ? (
            <p className="text-sm text-fg-muted">Your lesson history will build up here.</p>
          ) : (
            <PagedLinkList
              items={history.map((entry) => ({
                key: entry.date,
                href: `/lesson/${entry.date}`,
                title: entry.title,
                detail: `${formatDateLabel(entry.date)} · ${CATEGORIES[entry.category]}`,
              }))}
            />
          )}
          </section>
        </div>
      )}
    </LoadState>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame panels title="Library">{user && <Library uid={user.uid} />}</PageFrame>
    </AccessGate>
  );
}
