"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { isSuperadmin } from "@/lib/auth-guard";

/** Wraps an admin page that only a superadmin may see (the logs): an admin who opens it is told, and nothing is rendered or loaded. */
export function SuperadminOnly({ children }: { children: ReactNode }) {
  const { claims } = useAuth();
  if (!isSuperadmin(claims)) return <p className="py-6 text-center text-sm text-fg-muted">Only a superadmin can see this page.</p>;
  return <>{children}</>;
}
