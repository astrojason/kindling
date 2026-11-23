import type { ReactNode } from "react";

/**
 * The content column of a signed-in screen. On a phone it is a narrow column above the bottom tab bar; from the
 * `lg` breakpoint the tab bar is a 15rem sidebar on the left, so the column makes room for it (`sidebar`) and is
 * wider. A lesson being read (`reading`) has no tab bar and stays a comfortable reading width.
 */
export function AppColumn({ children, sidebar = true, reading = false }: { children: ReactNode; sidebar?: boolean; reading?: boolean }) {
  const width = reading ? "lg:max-w-2xl" : "lg:max-w-4xl";
  return (
    <div className={sidebar ? "lg:pl-60" : undefined}>
      <div className={`mx-auto w-full max-w-[560px] px-4 pt-8 ${width} lg:px-8 lg:pt-10 ${sidebar ? "pb-28 lg:pb-12" : "pb-10"}`}>{children}</div>
    </div>
  );
}
