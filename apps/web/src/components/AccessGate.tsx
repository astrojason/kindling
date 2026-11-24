"use client";

import type { ReactNode } from "react";
import { AccessPending } from "@/components/AccessPending";
import { LandingPage } from "@/components/LandingPage";
import { LoadingView } from "@/components/lesson/LoadingView";
import { useAuth } from "@/lib/auth-context";
import { hasAppAccess } from "@/lib/auth-guard";
import { useAccessStatus } from "@/lib/useAccessStatus";

// `user` is null both for a signed-out visitor and while Firebase Auth is still
// restoring a session, so the signed-out page is rendered underneath but
// covered by a loading overlay until auth reports. It stays in the DOM so
// Google's OAuth-verification crawler still reads the app's purpose in the
// HTML. After that, a blocking spinner covers waiting on the user's access status.
export function AccessGate({ children, signedOut = <LandingPage /> }: { children: ReactNode; signedOut?: ReactNode }) {
  const { user, claims, loading: authLoading } = useAuth();
  const { status, loading } = useAccessStatus(user, claims);

  if (!user && authLoading) {
    // Firebase Auth is still restoring the session. The signed-out page stays in
    // the DOM (so the server HTML and crawlers still carry it) but is covered by
    // an overlay until onAuthStateChanged fires, so a returning user never sees it.
    return (
      <>
        {signedOut}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg">
          <LoadingView text="Loading" />
        </div>
      </>
    );
  }

  if (!user) return <>{signedOut}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingView text="Loading" />
      </div>
    );
  }

  if (!hasAppAccess(status ?? "pending")) {
    return <AccessPending status={status === "revoked" ? "revoked" : "pending"} />;
  }

  return <>{children}</>;
}
