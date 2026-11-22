"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import packageJson from "../../../package.json";

const ICON = "size-6";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={ICON} aria-hidden="true">
      {children}
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Today", match: ["/"], icon: <Icon><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></Icon> },
  { href: "/library", label: "Explore", match: ["/library", "/lesson", "/stash", "/share"], icon: <Icon><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></Icon> },
  { href: "/review", label: "Review", match: ["/review"], icon: <Icon><rect x="7" y="3.5" width="12" height="15" rx="2.5" /><path d="M4.5 7v11a2.5 2.5 0 0 0 2.5 2.5h9" /></Icon> },
  { href: "/profile", label: "Profile", match: ["/profile", "/settings", "/admin"], icon: <Icon><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" /></Icon> },
];

function isActive(pathname: string, match: string[]): boolean {
  return match.some((prefix) => (prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`)));
}

/** The bottom tab bar shared by every signed-in screen outside a lesson. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface">
      <ul className="mx-auto flex w-full max-w-[560px] justify-around px-2">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.match);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${active ? "text-accent" : "text-fg-muted hover:text-fg"}`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="pb-[max(0.25rem,env(safe-area-inset-bottom))] text-center text-[9px] leading-none text-fg-muted">v{packageJson.version}</p>
    </nav>
  );
}
