"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppColumn } from "@/components/nav/AppColumn";
import { TabBar } from "@/components/nav/TabBar";
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
      <AppColumn>
        <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <aside className={`${isIndex ? "" : "hidden"} rounded-md bg-surface px-6 pb-7 pt-6 shadow-sm lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:px-5`}>
            {user && <NotesPage uid={user.uid} />}
          </aside>
          <section className={`${isIndex ? "hidden" : ""} lg:block`}>{children}</section>
        </div>
      </AppColumn>
      <TabBar />
    </>
  );
}
