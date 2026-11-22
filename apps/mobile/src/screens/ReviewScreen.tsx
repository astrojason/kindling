import { ScrollView, StyleSheet, Text } from "react-native";
import { todayStr } from "@random-knowledge/shared/date";
import { dueCards } from "@random-knowledge/shared/srs";
import { ErrorBox } from "../components/ErrorBox";
import { LoadingView } from "../components/LoadingView";
import { ReviewSession } from "../components/ReviewSession";
import { Card } from "../components/ui";
import { useProgressData } from "../hooks/useProgressData";
import { useAuth } from "../lib/auth-context";
import { useTheme } from "../lib/theme";

export function ReviewScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { data, error, loading } = useProgressData(user?.uid ?? "");
  const today = todayStr();
  const due = data ? dueCards(data.cards, today) : [];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card>
        <Text style={[styles.title, { color: theme.fgStrong }]}>Review</Text>
        {loading && <LoadingView text="Loading your review cards" />}
        {error && <ErrorBox message={error} />}
        {data && due.length === 0 && (
          <Text style={{ color: theme.fgMuted, textAlign: "center", paddingVertical: 24 }}>
            {data.cards.length === 0 ? "Finish a lesson and its quiz to unlock review cards." : "Nothing is due right now. Come back later."}
          </Text>
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
