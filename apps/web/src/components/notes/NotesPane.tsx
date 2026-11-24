import type { ReactNode } from "react";

/** The right-hand pane of the Notes screen (the whole screen on a phone): the note, its editor, the capture form or a quiz. */
export function NotesPane({ children }: { children: ReactNode }) {
  return <div className="rounded-md bg-surface px-6 pb-7 pt-6 shadow-sm lg:px-8 lg:pt-8">{children}</div>;
}
