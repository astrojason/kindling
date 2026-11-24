"use client";

import { useParams } from "next/navigation";
import { QuizSession } from "@/components/notes/QuizSession";
import { NotesPane } from "@/components/notes/NotesPane";
import { LoadState } from "@/components/share/PageFrame";
import { useAuth } from "@/lib/auth-context";
import { getNote } from "@/lib/notes-firestore";
import { useLoad } from "@/lib/useLoad";

function LoadedNote({ uid, id, getToken }: { uid: string; id: string; getToken: () => Promise<string> }) {
  const state = useLoad(`note-session-${uid}-${id}`, async () => {
    const note = await getNote(uid, id);
    return note && !note.deleted_at ? note : null;
  });
  return <LoadState state={state} notFound="That note isn't in your notes.">{(note) => <QuizSession uid={uid} note={note} getToken={getToken} />}</LoadState>;
}

export default function QuizSessionRoute() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  return (
    <NotesPane>{user && <LoadedNote uid={user.uid} id={id} getToken={() => user.getIdToken()} />}</NotesPane>
  );
}
