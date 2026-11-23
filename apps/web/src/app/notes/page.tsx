"use client";

import { AccessGate } from "@/components/AccessGate";
import { NotesPage } from "@/components/notes/NotesPage";
import { PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";

export default function NotesRoute() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame>{user && <NotesPage uid={user.uid} />}</PageFrame>
    </AccessGate>
  );
}
