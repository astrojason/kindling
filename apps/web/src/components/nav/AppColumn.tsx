import type { ReactNode } from "react";

/**
 * The content column of a signed-in screen. On a phone it is a narrow column above the bottom tab bar; from the
 * `lg` breakpoint the tab bar is a 76px rail on the left, so the column makes room for it (`sidebar`) and is
 * wider. `bleed` lets a screen use the whole width (the desktop Today). A lesson being read (`reading`) has no tab bar; its text stays a comfortable width beside a side rail.
 */
export function AppColumn({ children, sidebar = true, reading = false, bleed = false }: { children: ReactNode; sidebar?: boolean; reading?: boolean; bleed?: boolean }) {
  const width = bleed ? "lg:max-w-none lg:p-0" : reading ? "lg:max-w-5xl" : "lg:max-w-6xl lg:px-8 lg:pt-10";
  return (
    <div className={sidebar ? "lg:pl-[76px]" : undefined}>
      <div className={`mx-auto w-full max-w-[560px] px-4 pt-8 ${width} ${reading && !bleed ? "lg:px-8 lg:pt-10" : ""} ${sidebar ? (bleed ? "pb-28 lg:pb-0" : "pb-28 lg:pb-12") : "pb-10"}`}>{children}</div>
    </div>
  );
}
