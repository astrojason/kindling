const buttonClass =
  "rounded-button border-2 border-border px-3 py-1.5 text-xs font-extrabold text-fg-muted enabled:hover:border-accent enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-40";

/** Previous/Next controls for a zero-based `page`. Renders nothing when there is only one page. */
export function Pagination({
  page,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!hasPrev && !hasNext) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <button type="button" onClick={onPrev} disabled={!hasPrev} className={buttonClass}>Previous</button>
      <span className="text-xs text-fg-muted">Page {page + 1}</span>
      <button type="button" onClick={onNext} disabled={!hasNext} className={buttonClass}>Next</button>
    </div>
  );
}
