import { PagedLinkList } from "@/components/library/PagedLinkList";
import { CATEGORIES } from "@/lib/categories";
import { formatDateLabel } from "@/lib/date";
import type { ExploreLesson } from "@/lib/types";

/** Explore without an articles account: the lessons generated for everyone else (lessons aren't personal), newest first. */
export function OthersLessons({ lessons }: { lessons: ExploreLesson[] }) {
  return (
    <div>
      <h1 className="mb-1 font-heading text-xl font-bold text-fg-strong">More lessons</h1>
      <p className="mb-4 text-xs text-fg-muted">Lessons Kindling made for other readers.</p>
      <PagedLinkList
        items={lessons.map((lesson) => ({
          key: lesson.id,
          href: `/explore/${lesson.id}`,
          title: lesson.title,
          detail: `${CATEGORIES[lesson.category] ?? lesson.category} · ${formatDateLabel(lesson.key.slice(0, 10))}`,
        }))}
      />
    </div>
  );
}
