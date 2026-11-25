import type { SelectHTMLAttributes } from "react";
import { fieldClass } from "./field";

/**
 * A select in the shared field style. The browser's own arrow ignores the padding and sits on the
 * border, so it is hidden and a chevron is drawn inside the right padding instead.
 */
export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex">
      <select {...props} className={`${fieldClass} cursor-pointer appearance-none pr-9 ${className}`} />
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted">
        <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
