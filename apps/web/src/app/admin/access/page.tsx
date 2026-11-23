"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { AdminAccessList } from "@/components/admin/AdminAccessList";
import { LoadingView } from "@/components/lesson/LoadingView";
import { useAuth } from "@/lib/auth-context";
import { isSuperadmin, requestsForAdmin, type AccessRequest } from "@/lib/auth-guard";
import { requestJson } from "@/lib/api-client";
import { grantAccess, listAccessRequests, revokeAccess, setAutoGeneration } from "@/lib/firestore";

export default function AdminAccessPage() {
  const { user, claims } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<AccessRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Set<string> | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const superadmin = isSuperadmin(claims);

  useEffect(() => {
    listAccessRequests()
      .then(setRequests)
      .catch((err) => {
        console.error("Failed to load access requests", err);
        setError(err instanceof Error ? err.message : "Failed to load access requests");
      });
  }, []);

  useEffect(() => {
    if (!superadmin || !user) return;
    user.getIdToken()
      .then((token) => requestJson("/api/admin/roles", token))
      .then((data) => setAdmins(new Set(data.admins as string[])))
      .catch((err) => {
        console.error("Failed to load the admins", err);
        setError(err instanceof Error ? err.message : "Failed to load the admins");
      });
  }, [superadmin, user]);

  if (!user) return null;

  /** Saves a change to one request, then mirrors it locally; failures are logged and shown. */
  async function change(uid: string, save: () => Promise<void>, patch: Partial<AccessRequest>, failure: string, confirmation: string) {
    try {
      await save();
      toast(confirmation);
      setRequests((prev) => prev?.map((r) => (r.uid === uid ? { ...r, ...patch } : r)) ?? null);
    } catch (err) {
      console.error(failure, err);
      setError(err instanceof Error ? err.message : failure);
    }
  }

  /** Superadmin only: switches the admin claim on or off for one account, showing progress and any failure. */
  async function toggleAdmin(uid: string, makeAdmin: boolean) {
    if (!user) return;
    const who = requests?.find((r) => r.uid === uid);
    const name = who?.displayName ?? who?.email ?? uid;
    setBusyUid(uid);
    setError(null);
    try {
      await requestJson("/api/admin/set-admin", await user.getIdToken(), { method: "POST", body: JSON.stringify({ uid, admin: makeAdmin }) });
      setAdmins((prev) => {
        const next = new Set(prev ?? []);
        if (makeAdmin) next.add(uid);
        else next.delete(uid);
        return next;
      });
      toast(makeAdmin ? `${name} is now an admin. They must sign in again to use it.` : `${name} is no longer an admin.`);
    } catch (err) {
      console.error("Failed to change the admin role", err);
      setError(err instanceof Error ? err.message : "Failed to change the admin role");
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div>
      <h1 className="mb-5 font-heading text-xl font-bold text-fg-strong">Manage access</h1>
      {error && <p role="alert" className="mb-4 text-sm text-rust">{error}</p>}
      {requests === null ? (
        !error && <LoadingView text="Loading requests" />
      ) : (
        <AdminAccessList
          requests={requestsForAdmin(requests, user.uid)}
          canChangeAutoGeneration={superadmin}
          adminUids={admins ?? undefined}
          onToggleAdmin={superadmin && admins ? (uid, makeAdmin) => void toggleAdmin(uid, makeAdmin) : undefined}
          busyUid={busyUid}
          onGrant={(uid) => change(uid, () => grantAccess(uid, user.uid), { status: "granted" }, "Failed to grant access", "Access granted.")}
          onRevoke={(uid) => change(uid, () => revokeAccess(uid), { status: "revoked" }, "Failed to revoke access", "Access revoked.")}
          onToggleAutoGeneration={(uid, enabled) =>
            change(uid, () => setAutoGeneration(uid, enabled), { autoGeneration: enabled }, "Failed to change auto generation",
              enabled ? "Auto lessons turned on." : "Auto lessons turned off.")}
        />
      )}
    </div>
  );
}
