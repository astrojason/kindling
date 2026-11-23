import { ScrollView, StyleSheet, Text } from "react-native";
import { todayStr } from "@random-knowledge/shared/date";
import { dueNotes } from "@random-knowledge/shared/notes-view";
import { reviewEmptyMessage } from "@random-knowledge/shared/review-empty";
import { dueCards } from "@random-knowledge/shared/srs";
import { ErrorBox } from "../components/ErrorBox";
import { LoadingView } from "../components/LoadingView";
import { DueNotes } from "../components/notes/DueNotes";
import { ReviewSession } from "../components/ReviewSession";
import { Card } from "../components/ui";
import { useNotes } from "../hooks/useNotes";
import { useProgressData } from "../hooks/useProgressData";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme";

export function ReviewScreen({ onOpenNote }: { onOpenNote: (id: string) => void }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { data, error, loading } = useProgressData(user?.uid ?? "");
  const { notes, error: notesError } = useNotes(user?.uid ?? "");
  const today = todayStr();
  const due = data ? dueCards(data.cards, today) : [];
  const emptyMessage = data ? reviewEmptyMessage({ totalCards: data.cards.length, dueCards: due.length, totalNotes: notes?.length ?? 0, dueNotes: notes ? dueNotes(notes).length : 0 }) : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card>
        <Text style={[styles.title, { color: theme.fgStrong }]}>Review</Text>
        {loading && <LoadingView text="Loading your review cards" />}
        {error && <ErrorBox message={error} />}
        {data && <DueNotes notes={notes ?? []} error={notesError} onOpen={onOpenNote} />}
        {/* Only judge "nothing due" once the notes have loaded (or failed), so it never flashes while they are still coming. */}
        {data && (notes || notesError) && emptyMessage && (
          <Text style={{ color: theme.fgMuted, textAlign: "center", paddingVertical: 24 }}>{emptyMessage}</Text>
        )}
        {user && data && due.length > 0 && <ReviewSession uid={user.uid} today={today} cards={due} />}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 16 },
});
