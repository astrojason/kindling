"use client";

import type { ReactNode } from "react";
import { LoadingView } from "@/components/lesson/LoadingView";
import { AppColumn } from "@/components/nav/AppColumn";
import { TabBar } from "@/components/nav/TabBar";
import { useAuth } from "@/lib/auth-context";

/** A column of a desktop page: padded, with a hairline to the next one (on a phone the page card already surrounds it). */
export const PANEL = "lg:border-r lg:border-border lg:px-12 lg:py-7 lg:last:border-r-0";

/** The padding of a desktop page that is a single column. */
export const PAGE_BODY = "lg:max-w-4xl lg:px-12 lg:py-7";

/** The desktop page title bar: a hairline-bordered strip across the top (same as Today's). Hidden on a phone. */
export function DesktopHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="hidden h-16 flex-none items-center justify-between border-b border-border bg-surface px-12 lg:flex">
      <h1 className="text-xl font-black text-fg-strong">{title}</h1>
      {children}
    </header>
  );
}

/**
 * A page in the signed-in app, with the tab bar beside it (signed-out visitors get no tab bar). On a phone it is one
 * card on the lavender canvas. With `panels` it is, from `lg`, a full-width page: a title bar (`title`), then the
 * content in hairline-divided columns (see `PANEL`), like the desktop Today.
 */
export function PageFrame({ children, panels = false, title = "" }: { children: ReactNode; panels?: boolean; title?: string }) {
  const { user } = useAuth();
  return (
    <>
      <AppColumn sidebar={Boolean(user)} bleed={panels}>
        {panels && <DesktopHeader title={title} />}
        <div className={`rounded-md bg-surface px-6 pb-7 pt-6 shadow-sm ${panels ? "lg:flex lg:min-h-[calc(100vh-4rem)] lg:flex-col lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none" : "lg:px-8 lg:pt-8"}`}>{children}</div>
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
