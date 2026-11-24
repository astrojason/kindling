"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppColumn } from "@/components/nav/AppColumn";
import { TabBar } from "@/components/nav/TabBar";
import { DesktopHeader } from "@/components/share/PageFrame";
import { NotesPage } from "@/components/notes/NotesPage";
import { useAuth } from "@/lib/auth-context";

/**
 * The Notes section. On a phone the list and each note are separate screens (the list at `/notes`, the rest as the
 * page). From `lg` the list stays on the left and the note, editor, capture form or quiz opens beside it.
 */
export function NotesFrame({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isIndex = usePathname() === "/notes";
  return (
    <>
      <AppColumn bleed>
        <DesktopHeader title="Notes" />
        <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
          <aside className={`${isIndex ? "" : "hidden"} rounded-md bg-surface px-6 pb-7 pt-6 shadow-sm lg:sticky lg:top-0 lg:block lg:max-h-screen lg:min-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:rounded-none lg:border-r lg:border-border lg:px-6 lg:py-6 lg:shadow-none`}>
            {user && <NotesPage uid={user.uid} />}
          </aside>
          <section className={`${isIndex ? "hidden" : ""} lg:block`}>{children}</section>
        </div>
      </AppColumn>
      <TabBar />
    </>
  );
}
