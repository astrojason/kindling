"use client";

import { useParams } from "next/navigation";
import { EditNote } from "@/components/notes/EditNote";
import { NotesPane } from "@/components/notes/NotesPane";
import { LoadState } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";
import { getNote } from "@/lib/notes-firestore";
import { useLoad } from "@/lib/useLoad";

function LoadedNote({ uid, id }: { uid: string; id: string }) {
  const state = useLoad(`note-edit-${uid}-${id}`, async () => {
    const note = await getNote(uid, id);
    return note && !note.deleted_at ? note : null;
  });
  return <LoadState state={state} notFound="That note isn't in your notes.">{(note) => <EditNote uid={uid} note={note} />}</LoadState>;
}

export default function EditNoteRoute() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  return (
    <NotesPane>{user && <LoadedNote uid={user.uid} id={id} />}</NotesPane>
  );
}
