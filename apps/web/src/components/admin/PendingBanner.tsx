"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { usePendingRequests } from "@/lib/usePendingRequests";

/** For an admin or superadmin: a notice that people are waiting for access, linking to where to decide. Nothing for anyone else. */
export function PendingBanner() {
  const { user, claims } = useAuth();
  const { count, error } = usePendingRequests(user?.uid, claims);

  if (error) return <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">Could not check for people waiting for access: {error}</pre>;
  if (!count) return null;
  return (
    <Link href="/admin/access" className="flex items-center justify-between rounded-md bg-accent px-4 py-3 text-sm font-extrabold text-accent-fg shadow-sm hover:opacity-90">
      <span>{count} {count === 1 ? "person" : "people"} waiting for access</span>
      <span aria-hidden="true">Review →</span>
    </Link>
  );
}
