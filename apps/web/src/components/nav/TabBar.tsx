"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { exploreAvailable, useExplore } from "@/lib/useExplore";
import { usePendingRequests } from "@/lib/usePendingRequests";
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
  { href: "/discover", label: "Explore", match: ["/discover", "/share"], icon: <Icon><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></Icon> },
  { href: "/notes", label: "Notes", match: ["/notes"], icon: <Icon><path d="M6 3.5h9l3.5 3.5v13H6Z" /><path d="M14.5 3.5V7.5h4M9 12h6M9 15.5h6" /></Icon> },
  { href: "/review", label: "Review", match: ["/review", "/library", "/lesson", "/stash"], icon: <Icon><rect x="7" y="3.5" width="12" height="15" rx="2.5" /><path d="M4.5 7v11a2.5 2.5 0 0 0 2.5 2.5h9" /></Icon> },
  { href: "/profile", label: "Profile", match: ["/profile", "/settings", "/admin"], icon: <Icon><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" /></Icon> },
];

/** Typing in a field, or holding a modifier, must never trigger a shortcut. */
function isShortcut(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  const el = e.target instanceof HTMLElement ? e.target : null;
  return !(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

function isActive(pathname: string, match: string[]): boolean {
  return match.some((prefix) => (prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`)));
}

/** The bottom tab bar shared by every signed-in screen outside a lesson. */
export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, claims } = useAuth();
  const { count: waiting } = usePendingRequests(user?.uid, claims);
  // Explore is hidden when there is nothing to explore: no articles account and nothing anyone has shared.
  const showExplore = exploreAvailable(useExplore(user));
  const tabs = useMemo(() => TABS.filter((tab) => tab.href !== "/discover" || showExplore), [showExplore]);
  // Desktop shortcut: press 1 to 5 to jump to a tab.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tab = tabs[Number(e.key) - 1];
      if (tab && isShortcut(e)) router.push(tab.href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, tabs]);
  return (
    <nav aria-label="Main" data-tabbar className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface lg:inset-y-0 lg:right-auto lg:flex lg:w-[76px] lg:flex-col lg:items-center lg:border-r lg:border-t-0 lg:px-0 lg:pb-5 lg:pt-6">
      <span role="img" aria-label="Kindling" className="hidden pb-6 text-gold lg:block">
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-[26px]" aria-hidden="true">
          <path d="M10 1.5c.4 2.3-.6 3.7-1.9 5.1-1.4 1.5-3 3.2-3 5.9a4.9 4.9 0 0 0 9.8 0c0-1.7-.7-2.9-1.5-3.9-.1.9-.5 1.7-1.2 2.3.2-2.4-.7-3.7-2.2-6.1Z" />
        </svg>
      </span>
      <ul className="mx-auto flex w-full max-w-[560px] justify-around px-2 lg:mx-0 lg:max-w-none lg:flex-col lg:items-center lg:justify-start lg:gap-1.5 lg:px-0">
        {tabs.map((tab, index) => {
          const active = isActive(pathname, tab.match);
          return (
            <li key={tab.href} className="flex-1 lg:w-[60px] lg:flex-none">
              <Link
                href={tab.href}
                title={`${tab.label} (${index + 1})`}
                aria-keyshortcuts={String(index + 1)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold lg:gap-[3px] lg:rounded-button lg:py-[9px] lg:font-extrabold ${active ? "text-accent lg:bg-accent-soft" : "text-fg-muted hover:text-fg lg:hover:bg-accent-soft"}`}
              >
                <span className="relative">
                  {tab.icon}
                  {tab.href === "/profile" && waiting ? (
                    <span aria-label={`${waiting} waiting for access`} className="absolute -right-2 -top-1 flex min-w-4 items-center justify-center rounded-full bg-rust px-1 text-[10px] font-extrabold leading-4 text-accent-fg">
                      {waiting}
                    </span>
                  ) : null}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="pb-[max(0.25rem,env(safe-area-inset-bottom))] text-center text-[9px] leading-none text-fg-muted lg:mt-auto lg:pb-0 lg:text-[10px]">v{packageJson.version}</p>
    </nav>
  );
}
