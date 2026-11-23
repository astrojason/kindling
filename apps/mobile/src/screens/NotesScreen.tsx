import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { ErrorBox } from "../components/ErrorBox";
import { LoadingView } from "../components/LoadingView";
import { EditNote } from "../components/notes/EditNote";
import { NewNote } from "../components/notes/NewNote";
import { NoteDetail } from "../components/notes/NoteDetail";
import { NotesList } from "../components/notes/NotesList";
import { Card } from "../components/ui";
import { useNote } from "../hooks/useNote";
import { useNotes } from "../hooks/useNotes";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme";

type Route = { name: "list" } | { name: "new" } | { name: "detail"; id: string } | { name: "edit"; id: string };

/** The Notes tab: the library, and from it a note, its editor and the capture form. */
export function NotesScreen() {
  const { user } = useAuth();
  const [route, setRoute] = useState<Route>({ name: "list" });
  const [notice, setNotice] = useState<string | null>(null);
  if (!user) return null;
  const uid = user.uid;
  const getToken = () => user.getIdToken();

  function go(next: Route, message: string | null = null) {
    setNotice(message);
    setRoute(next);
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Card>
        {route.name === "list" && <ListRoute uid={uid} notice={notice} onOpen={(id) => go({ name: "detail", id })} onCapture={() => go({ name: "new" })} />}
        {route.name === "new" && <NewNote uid={uid} getToken={getToken} onSaved={(id, message) => go({ name: "detail", id }, message)} onCancel={() => go({ name: "list" })} />}
        {route.name === "detail" && <DetailRoute uid={uid} id={route.id} notice={notice} onBack={() => go({ name: "list" })} onEdit={() => go({ name: "edit", id: route.id })} onDeleted={(message) => go({ name: "list" }, message)} />}
        {route.name === "edit" && <EditRoute uid={uid} id={route.id} onSaved={(message) => go({ name: "detail", id: route.id }, message)} onCancel={() => go({ name: "detail", id: route.id })} />}
      </Card>
    </ScrollView>
  );
}

function ListRoute({ uid, notice, onOpen, onCapture }: { uid: string; notice: string | null; onOpen: (id: string) => void; onCapture: () => void }) {
  const { notes, error } = useNotes(uid);
  if (notes === null && !error) return <LoadingView text="Loading notes" />;
  return <NotesList notes={notes ?? []} error={error} notice={notice} onOpen={onOpen} onCapture={onCapture} />;
}

function useLoadedNote(uid: string, id: string) {
  const theme = useTheme();
  const { note, error, loading } = useNote(uid, id);
  const status = loading ? <LoadingView text="Loading note" /> : error ? <ErrorBox message={error} /> : !note ? <Text style={{ color: theme.fgMuted, textAlign: "center", paddingVertical: 24 }}>That note isn&apos;t in your notes.</Text> : null;
  return { note, status };
}

function DetailRoute({ uid, id, notice, onBack, onEdit, onDeleted }: { uid: string; id: string; notice: string | null; onBack: () => void; onEdit: () => void; onDeleted: (message: string) => void }) {
  const theme = useTheme();
  const { note, status } = useLoadedNote(uid, id);
  if (!note) return status;
  return (
    <>
      {notice && <Text accessibilityRole="alert" style={[styles.notice, { backgroundColor: theme.accentSoft, color: theme.accent }]}>{notice}</Text>}
      <NoteDetail uid={uid} note={note} onBack={onBack} onEdit={onEdit} onDeleted={onDeleted} />
    </>
  );
}

function EditRoute({ uid, id, onSaved, onCancel }: { uid: string; id: string; onSaved: (message: string) => void; onCancel: () => void }) {
  const { note, status } = useLoadedNote(uid, id);
  if (!note) return status;
  return <EditNote uid={uid} note={note} onSaved={onSaved} onCancel={onCancel} />;
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  notice: { borderRadius: 8, padding: 10, fontSize: 13, fontWeight: "700", marginBottom: 12 },
});
