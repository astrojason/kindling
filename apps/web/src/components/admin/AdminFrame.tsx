"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PAGE_BODY, PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";
import { isSuperadmin } from "@/lib/auth-guard";

const SECTIONS = [
  { href: "/admin/access", label: "Manage access", superadminOnly: false },
  { href: "/admin/generation-log", label: "Generation log", superadminOnly: true },
  { href: "/admin/cron-log", label: "Cron run log", superadminOnly: true },
];

/** The admin pages, in the same frame as the rest of the app. Its sections are tabs: a row at the top of the card on a phone, a strip under the title bar from `lg`. */
export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { claims } = useAuth();
  const sections = SECTIONS.filter((s) => !s.superadminOnly || isSuperadmin(claims));
  return (
    <PageFrame panels title="Admin">
      <nav aria-label="Admin" role="tablist" className="-mx-6 mb-5 flex gap-5 overflow-x-auto border-b border-border px-6 text-xs font-semibold lg:mx-0 lg:mb-0 lg:h-12 lg:flex-none lg:gap-8 lg:bg-surface lg:px-12 lg:text-sm">
        {sections.map(({ href, label }) => {
          const current = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              role="tab"
              aria-selected={current}
              aria-current={current ? "page" : undefined}
              className={`-mb-px flex flex-none items-center whitespace-nowrap border-b-2 pb-3 lg:pb-0 ${current ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className={PAGE_BODY}>{children}</div>
    </PageFrame>
  );
}
