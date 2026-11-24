"use client";

import type { ReactNode } from "react";
import { LoadingView } from "@/components/lesson/LoadingView";
import { AppColumn } from "@/components/nav/AppColumn";
import { TabBar } from "@/components/nav/TabBar";
import { useAuth } from "@/lib/auth-context";

/** Classes that make a section a card of its own from `lg` (on a phone the page card already surrounds it). */
export const PANEL = "lg:rounded-md lg:bg-surface lg:p-6 lg:shadow-sm";

/** A page in the signed-in app: content on the lavender canvas (one card on a phone; with `panels`, separate cards from `lg`, see `PANEL`) with the tab bar below (signed-out visitors get no tab bar). */
export function PageFrame({ children, panels = false }: { children: ReactNode; panels?: boolean }) {
  const { user } = useAuth();
  return (
    <>
      <AppColumn sidebar={Boolean(user)}>
        <div className={`rounded-md bg-surface px-6 pb-7 pt-6 shadow-sm ${panels ? "lg:bg-transparent lg:p-0 lg:shadow-none" : "lg:px-8 lg:pt-8"}`}>{children}</div>
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
