"use client";

import type { AccessRequest } from "@/lib/auth-guard";
import { autoGenerationEnabled } from "@/lib/paused-generation";

export function AdminAccessList({
  requests,
  onGrant,
  onRevoke,
  onToggleAutoGeneration,
  canChangeAutoGeneration = true,
  adminUids,
  onToggleAdmin,
  busyUid = null,
}: {
  requests: AccessRequest[];
  onGrant: (uid: string) => void;
  onRevoke: (uid: string) => void;
  onToggleAutoGeneration: (uid: string, enabled: boolean) => void;
  /** Only a superadmin may switch a user's auto lessons; an admin sees the list without that switch. */
  canChangeAutoGeneration?: boolean;
  /** Superadmin only: who holds the admin claim, and how to change it. Without a handler there is no admin control. */
  adminUids?: ReadonlySet<string>;
  onToggleAdmin?: (uid: string, makeAdmin: boolean) => void;
  /** The account whose role is being changed right now. */
  busyUid?: string | null;
}) {
  if (requests.length === 0) {
    return <p className="text-sm text-fg-muted">No access requests yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((req) => (
        <li
          key={req.uid}
          className="flex items-center justify-between rounded-sm border border-border bg-surface-raised px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-fg">{req.displayName ?? req.email ?? req.uid}</p>
            <p className="text-xs text-fg-muted">
              {req.email} · <span className="capitalize">{req.status}</span>
            </p>
            {req.status === "pending" && req.notifyError && (
              <p data-notify-error className="mt-1 text-xs text-rust select-all">Admins could not be notified: {req.notifyError}</p>
            )}
          </div>
          {req.status === "granted" ? (
            <div className="flex items-center gap-2">
              {canChangeAutoGeneration && (
                <button
                  type="button"
                  onClick={() => onToggleAutoGeneration(req.uid, !autoGenerationEnabled(req))}
                  title="When off, they keep seeing their last generated lesson"
                  className="rounded-button border-2 border-border px-3 py-1.5 text-xs font-extrabold text-fg-muted hover:border-accent"
                >
                  Auto lessons: {autoGenerationEnabled(req) ? "on" : "off"}
                </button>
              )}
              {onToggleAdmin && (
                <button
                  type="button"
                  disabled={busyUid === req.uid}
                  onClick={() => onToggleAdmin(req.uid, !adminUids?.has(req.uid))}
                  className="rounded-button border-2 border-border px-3 py-1.5 text-xs font-extrabold text-fg-muted hover:border-accent disabled:opacity-50"
                >
                  {busyUid === req.uid ? "Saving…" : adminUids?.has(req.uid) ? "Remove admin" : "Make admin"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onRevoke(req.uid)}
                className="rounded-button border-2 border-border px-3 py-1.5 text-xs font-extrabold text-fg-muted hover:border-accent"
              >
                Revoke
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onGrant(req.uid)}
              className="rounded-button bg-accent px-3 py-1.5 text-xs font-extrabold text-accent-fg hover:opacity-85"
            >
              Grant
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
