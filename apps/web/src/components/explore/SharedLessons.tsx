import { PagedLinkList } from "@/components/library/PagedLinkList";
import { CATEGORIES } from "@/lib/categories";
import type { SharedLessonSummary } from "@/lib/types";

/** Explore without an articles account: lessons other people shared, each opening its share page (where it can be stashed). */
export function SharedLessons({ shared }: { shared: SharedLessonSummary[] }) {
  return (
    <div>
      <h1 className="mb-1 font-heading text-xl font-bold text-fg-strong">Shared by others</h1>
      <p className="mb-4 text-xs text-fg-muted">Lessons other Kindling readers have shared.</p>
      <PagedLinkList
        items={shared.map((share) => ({
          key: share.id,
          href: `/share/${share.id}`,
          title: share.title,
          detail: `${CATEGORIES[share.category] ?? share.category}${share.ownerName ? ` · shared by ${share.ownerName}` : ""}`,
        }))}
      />
    </div>
  );
}
