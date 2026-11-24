import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DiscoverFeed } from "../components/discover/DiscoverFeed";
import { ErrorBox } from "../components/ErrorBox";
import { LoadingView } from "../components/LoadingView";
import { EditNote } from "../components/notes/EditNote";
import { NewNote } from "../components/notes/NewNote";
import { NoteDetail } from "../components/notes/NoteDetail";
import { NotesList } from "../components/notes/NotesList";
import { QuizSession } from "../components/notes/QuizSession";
import { Card } from "../components/ui";
import { useNote } from "../hooks/useNote";
import { useNotes } from "../hooks/useNotes";
import { useAuth } from "../lib/auth-context";
import { useIsTablet } from "../lib/layout";
import { useTheme } from "../lib/theme";

export type NotesRoute = { name: "list" } | { name: "new" } | { name: "detail"; id: string } | { name: "edit"; id: string } | { name: "quiz"; id: string } | { name: "discover" };

/** The Notes tab: the library, and from it a note, its editor and the capture form. */
export function NotesScreen({ initialRoute = { name: "list" } }: { initialRoute?: NotesRoute }) {
  const { user } = useAuth();
  const theme = useTheme();
  const tablet = useIsTablet();
  const [route, setRoute] = useState<NotesRoute>(initialRoute);
  const [notice, setNotice] = useState<string | null>(null);
  if (!user) return null;
  const uid = user.uid;
  const getToken = () => user.getIdToken();

  function go(next: NotesRoute, message: string | null = null) {
    setNotice(message);
    setRoute(next);
  }

  const detail = (
    <>
      {route.name === "new" && <NewNote uid={uid} getToken={getToken} onSaved={(id, message) => go({ name: "detail", id }, message)} onCancel={() => go({ name: "list" })} />}
      {route.name === "detail" && <DetailRoute uid={uid} id={route.id} notice={notice} onBack={() => go({ name: "list" })} onEdit={() => go({ name: "edit", id: route.id })} onQuiz={() => go({ name: "quiz", id: route.id })} onDeleted={(message) => go({ name: "list" }, message)} />}
      {route.name === "discover" && <DiscoverFeed uid={uid} getToken={getToken} onBack={() => go({ name: "list" })} onSaved={(id, message) => go({ name: "detail", id }, message)} />}
      {route.name === "quiz" && <QuizRoute uid={uid} id={route.id} getToken={getToken} onBack={() => go({ name: "detail", id: route.id })} onFinished={(message) => go({ name: "detail", id: route.id }, message)} />}
      {route.name === "edit" && <EditRoute uid={uid} id={route.id} onSaved={(message) => go({ name: "detail", id: route.id }, message)} onCancel={() => go({ name: "detail", id: route.id })} />}
    </>
  );
  const list = <ListRoute uid={uid} notice={tablet ? null : notice} onOpen={(id) => go({ name: "detail", id })} onCapture={() => go({ name: "new" })} onDiscover={() => go({ name: "discover" })} />;

  if (tablet) {
    return (
      <View style={styles.split}>
        <ScrollView style={[styles.listPane, { borderColor: theme.border }]} contentContainerStyle={styles.scroll}>
          <Card>{list}</Card>
        </ScrollView>
        <ScrollView style={styles.detailPane} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Card>
            {route.name === "list" ? (
              <>
                {notice && <Text accessibilityRole="alert" style={[styles.notice, { backgroundColor: theme.accentSoft, color: theme.accent }]}>{notice}</Text>}
                <Text style={{ color: theme.fgMuted, textAlign: "center", paddingVertical: 48 }}>Choose a note on the left, or capture a new one.</Text>
              </>
            ) : detail}
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Card>{route.name === "list" ? list : detail}</Card>
    </ScrollView>
  );
}

function ListRoute({ uid, notice, onOpen, onCapture, onDiscover }: { uid: string; notice: string | null; onOpen: (id: string) => void; onCapture: () => void; onDiscover: () => void }) {
  const { notes, error } = useNotes(uid);
  if (notes === null && !error) return <LoadingView text="Loading notes" />;
  return <NotesList notes={notes ?? []} error={error} notice={notice} onOpen={onOpen} onCapture={onCapture} onDiscover={onDiscover} />;
}

function useLoadedNote(uid: string, id: string) {
  const theme = useTheme();
  const { note, error, loading } = useNote(uid, id);
  const status = loading ? <LoadingView text="Loading note" /> : error ? <ErrorBox message={error} /> : !note ? <Text style={{ color: theme.fgMuted, textAlign: "center", paddingVertical: 24 }}>That note isn&apos;t in your notes.</Text> : null;
  return { note, status };
}

function DetailRoute({ uid, id, notice, onBack, onEdit, onQuiz, onDeleted }: { uid: string; id: string; notice: string | null; onBack: () => void; onEdit: () => void; onQuiz: () => void; onDeleted: (message: string) => void }) {
  const theme = useTheme();
  const { note, status } = useLoadedNote(uid, id);
  if (!note) return status;
  return (
    <>
      {notice && <Text accessibilityRole="alert" style={[styles.notice, { backgroundColor: theme.accentSoft, color: theme.accent }]}>{notice}</Text>}
      <NoteDetail uid={uid} note={note} onBack={onBack} onEdit={onEdit} onQuiz={onQuiz} onDeleted={onDeleted} />
    </>
  );
}

function QuizRoute({ uid, id, getToken, onBack, onFinished }: { uid: string; id: string; getToken: () => Promise<string>; onBack: () => void; onFinished: (message: string) => void }) {
  const { note, status } = useLoadedNote(uid, id);
  if (!note) return status;
  return <QuizSession uid={uid} note={note} getToken={getToken} onBack={onBack} onFinished={onFinished} />;
}

function EditRoute({ uid, id, onSaved, onCancel }: { uid: string; id: string; onSaved: (message: string) => void; onCancel: () => void }) {
  const { note, status } = useLoadedNote(uid, id);
  if (!note) return status;
  return <EditNote uid={uid} note={note} onSaved={onSaved} onCancel={onCancel} />;
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: "row" },
  listPane: { width: 380, flexGrow: 0, borderRightWidth: 1 },
  detailPane: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  notice: { borderRadius: 8, padding: 10, fontSize: 13, fontWeight: "700", marginBottom: 12 },
});
