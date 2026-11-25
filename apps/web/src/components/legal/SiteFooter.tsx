import Link from "next/link";

const LINKS = [
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
];

/**
 * The footer on every page. Where the app's tab bar is showing (`data-tabbar` on the body's subtree) it clears the
 * fixed bar: above it on a phone, beside the left rail from `lg`.
 */
export function SiteFooter() {
  return (
    <footer className="pb-6 pt-2 group-has-[[data-tabbar]]/app:pb-24 lg:group-has-[[data-tabbar]]/app:pb-6 lg:group-has-[[data-tabbar]]/app:pl-[76px]">
      <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-1 px-4 text-xs text-fg-muted">
        {LINKS.map(({ href, label }) => (
          <Link key={href} href={href} className="hover:text-accent">{label}</Link>
        ))}
      </nav>
    </footer>
  );
}
