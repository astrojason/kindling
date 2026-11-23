"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/lesson/Card";
import { useAuth } from "@/lib/auth-context";
import { isSuperadmin } from "@/lib/auth-guard";

const SECTIONS = [
  { href: "/admin/access", label: "Manage access", superadminOnly: false },
  { href: "/admin/generation-log", label: "Generation log", superadminOnly: true },
  { href: "/admin/cron-log", label: "Cron run log", superadminOnly: true },
];

export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { claims } = useAuth();
  const sections = SECTIONS.filter((s) => !s.superadminOnly || isSuperadmin(claims));
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-10 lg:max-w-3xl">
      <Card>
        <nav className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3.5 text-xs font-medium">
          <Link href="/" className="text-fg-muted underline decoration-border decoration-1 underline-offset-2 hover:text-accent">
            Today&apos;s lesson
          </Link>
          {sections.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={pathname === href ? "font-semibold text-accent" : "text-fg-muted hover:text-accent"}
            >
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </Card>
    </div>
  );
}
