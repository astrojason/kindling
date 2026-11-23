"use client";

import type { ReactNode } from "react";
import { LoadingView } from "@/components/lesson/LoadingView";
import { AppColumn } from "@/components/nav/AppColumn";
import { TabBar } from "@/components/nav/TabBar";
import { useAuth } from "@/lib/auth-context";

/** A page in the signed-in app: content on the lavender canvas with the tab bar below (signed-out visitors get no tab bar). */
export function PageFrame({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <>
      <AppColumn sidebar={Boolean(user)}>
        <div className="rounded-md bg-surface px-6 pb-7 pt-6 shadow-sm lg:px-8 lg:pt-8">{children}</div>
      </AppColumn>
      {user && <TabBar />}
    </>
  );
}

/** Loading / error / not-found handling shared by every page that loads a single lesson. */
export function LoadState<T>({
  state,
  notFound,
  children,
}: {
  state: { loading: boolean; data: T | null; error: string | null };
  notFound: string;
  children: (data: T) => ReactNode;
}) {
  if (state.loading) return <LoadingView text="Loading" />;
  if (state.error) return <p role="alert" className="py-8 text-center text-sm text-rust">{state.error}</p>;
  if (!state.data) return <p className="py-8 text-center text-sm text-fg-muted">{notFound}</p>;
  return <>{children(state.data)}</>;
}
