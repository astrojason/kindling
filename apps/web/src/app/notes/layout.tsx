import type { ReactNode } from "react";
import { AccessGate } from "@/components/AccessGate";
import { NotesFrame } from "@/components/notes/NotesFrame";

export default function NotesLayout({ children }: { children: ReactNode }) {
  return (
    <AccessGate>
      <NotesFrame>{children}</NotesFrame>
    </AccessGate>
  );
}
