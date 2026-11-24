import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md bg-surface px-6 pb-7 pt-6 shadow-sm ${className}`}>{children}</div>;
}
