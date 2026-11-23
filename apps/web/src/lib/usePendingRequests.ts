"use client";

import { useEffect, useState } from "react";
import { subscribeToPendingRequests } from "@random-knowledge/shared/pending-requests";
import { db } from "@/lib/firebase";
import { canManageAccess, type AuthClaims } from "@/lib/auth-guard";

/**
 * How many people are waiting for access, live, for an admin or superadmin; `count` stays null for anyone
 * else (nothing is subscribed to) and until the first snapshot. A failed subscription is logged and returned in full.
 */
export function usePendingRequests(uid: string | undefined, claims: AuthClaims | null): { count: number | null; error: string | null } {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watching = Boolean(uid) && canManageAccess(claims);

  useEffect(() => {
    if (!watching || !uid) return;
    return subscribeToPendingRequests(db, uid, setCount, (err) => {
      console.error("Failed to watch pending access requests", err);
      setError(err.message);
    });
  }, [watching, uid]);

  return watching ? { count, error } : { count: null, error: null };
}
