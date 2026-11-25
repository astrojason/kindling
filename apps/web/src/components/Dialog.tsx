"use client";

import { useEffect, type ReactNode } from "react";

/** An in-app modal for a form or editor: a titled panel over a dimmed page, closed by its own controls or Escape. */
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg-strong/40 px-4 py-6">
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-full w-full max-w-2xl overflow-y-auto rounded-md bg-surface p-6 shadow-lg">
        {children}
      </div>
    </div>
  );
}
