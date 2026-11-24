"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { resetAllUserData } from "@/lib/firestore";

/** "Reset my data": clears streak, history, lessons and preferences, only after a confirmation that says so. */
export function ResetDataLink({ uid, onReset }: { uid: string; onReset: () => void }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      await resetAllUserData(uid);
      setConfirming(false);
      onReset();
      toast("Your data was reset.");
    } catch (err) {
      console.error("Reset failed:", err);
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setConfirming(true)} className="text-xs text-fg-muted underline">
        Reset my data
      </button>
      {confirming && (
        <ConfirmDialog
          title="Reset your data?"
          message="This clears your streak, history, lessons, stash and topic preferences. This cannot be undone."
          confirmLabel="Reset my data"
          busy={busy}
          busyLabel="Resetting…"
          error={error}
          onConfirm={() => void reset()}
          onCancel={() => {
            setConfirming(false);
            setError(null);
          }}
        />
      )}
    </>
  );
}
