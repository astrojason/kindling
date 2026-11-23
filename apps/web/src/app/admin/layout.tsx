"use client";

import type { ReactNode } from "react";
import { AccessPending } from "@/components/AccessPending";
import { LandingPage } from "@/components/LandingPage";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { LoadingView } from "@/components/lesson/LoadingView";
import { useAuth } from "@/lib/auth-context";
import { canManageAccess } from "@/lib/auth-guard";

/** Every page under /admin renders only for a superadmin or an admin (the log pages narrow that to superadmins); everyone else sees what they would anywhere else. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, claims, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingView text="Loading" />
      </div>
    );
  }
  if (!user) return <LandingPage />;
  if (!canManageAccess(claims)) return <AccessPending status="pending" />;
  return <AdminFrame>{children}</AdminFrame>;
}
