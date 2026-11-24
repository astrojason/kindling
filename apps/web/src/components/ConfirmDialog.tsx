"use client";

import { useEffect } from "react";

/**
 * A confirmation every delete must go through. It names what is about to be removed, locks both buttons
 * while the work runs, and shows a failure in full instead of closing.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  busyLabel = "Working…",
  error = null,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  busyLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg-strong/40 px-4">
      <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-sm rounded-md bg-surface p-5 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-fg-strong">{title}</h2>
        <p className="mt-2 text-sm text-fg">{message}</p>
        {error && <pre role="alert" className="mt-3 whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-button border-2 border-border px-3.5 py-1.5 text-sm font-extrabold text-fg-muted disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="rounded-button bg-rust px-3.5 py-1.5 text-sm font-extrabold text-accent-fg disabled:opacity-50">
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
