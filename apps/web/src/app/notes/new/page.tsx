"use client";

import { AccessGate } from "@/components/AccessGate";
import { NewNote } from "@/components/notes/NewNote";
import { PageFrame } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";

export default function NewNoteRoute() {
  const { user } = useAuth();
  return (
    <AccessGate>
      <PageFrame>{user && <NewNote uid={user.uid} getToken={() => user.getIdToken()} />}</PageFrame>
    </AccessGate>
  );
}
