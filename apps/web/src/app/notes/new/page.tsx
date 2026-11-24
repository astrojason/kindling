"use client";

import { NewNote } from "@/components/notes/NewNote";
import { NotesPane } from "@/components/notes/NotesPane";
import { useAuth } from "@/lib/auth-context";

export default function NewNoteRoute() {
  const { user } = useAuth();
  return (
    <NotesPane>{user && <NewNote uid={user.uid} getToken={() => user.getIdToken()} />}</NotesPane>
  );
}
