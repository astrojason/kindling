"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";
import { canManageAccess, isSuperadmin } from "@/lib/auth-guard";
import { usePendingRequests } from "@/lib/usePendingRequests";

const SECTIONS = [
  { href: "/profile", label: "Profile", role: "everyone" },
  { href: "/admin/access", label: "Manage access", role: "admin" },
  { href: "/admin/generation-log", label: "Generation log", role: "superadmin" },
  { href: "/admin/cron-log", label: "Cron run log", role: "superadmin" },
] as const;

/**
 * The Profile page (profile and settings) and, for an admin, the admin sections beside it as tabs along the top (a
 * superadmin also gets the logs). Someone who is not an admin just sees their profile, with no tabs.
 */
export function ProfileFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, claims } = useAuth();
  const { count: waiting } = usePendingRequests(user?.uid, claims);
  const admin = canManageAccess(claims);
  const sections = SECTIONS.filter((s) => s.role === "everyone" || (s.role === "admin" ? admin : isSuperadmin(claims)));
  return (
    <PageFrame panels title="Profile">
      {admin && (
        <nav aria-label="Profile sections" role="tablist" className="-mx-6 mb-5 flex gap-5 overflow-x-auto border-b border-border px-6 text-xs font-semibold lg:mx-0 lg:mb-0 lg:h-12 lg:flex-none lg:gap-8 lg:bg-surface lg:px-12 lg:text-sm">
          {sections.map(({ href, label }) => {
            const current = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                role="tab"
                aria-selected={current}
                aria-current={current ? "page" : undefined}
                className={`-mb-px flex flex-none items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 lg:pb-0 ${current ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg"}`}
              >
                {label}
                {href === "/admin/access" && waiting ? (
                  <span aria-label={`${waiting} waiting for access`} className="rounded-full bg-rust px-1.5 text-[10px] font-extrabold leading-4 text-accent-fg">{waiting}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      )}
      {children}
    </PageFrame>
  );
}
