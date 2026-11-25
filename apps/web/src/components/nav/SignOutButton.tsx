"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

/** The header's sign-out control: a door icon, disabled while it works; a failure is shown under it in full. */
export function SignOutButton() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
      setError(err instanceof Error ? err.message : "Could not sign out.");
      setBusy(false);
    }
  }

  const label = busy ? "Signing out…" : "Sign out";
  return (
    <div className="relative flex-none">
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={busy}
        aria-label={label}
        title={label}
        className="flex size-9 items-center justify-center rounded-button text-fg-muted hover:bg-accent-soft hover:text-accent disabled:animate-pulse disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
          <path d="M13.5 3.5H6a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 6 20.5h7.5" />
          <path d="M13.5 3.5 19 5v14l-5.5 1.5Z" />
          <path d="M16 12h.01" />
        </svg>
      </button>
      {error && (
        <pre role="alert" className="absolute right-0 top-full z-40 mt-1 w-64 whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust shadow-lg select-all">
          Could not sign out: {error}
        </pre>
      )}
    </div>
  );
}
