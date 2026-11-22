import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-md bg-surface px-6 pb-7 pt-6 shadow-sm">{children}</div>;
}
