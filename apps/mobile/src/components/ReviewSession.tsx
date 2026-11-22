import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CATEGORIES } from "@random-knowledge/shared/categories";
import { rateCard } from "@random-knowledge/shared/srs";
import type { ReviewCard, ReviewRating } from "@random-knowledge/shared/types";
import { reviewXp } from "@random-knowledge/shared/xp";
import { nowMs } from "@random-knowledge/shared/clock";
import { addStats, saveReviewCard } from "../lib/firestore";
import { radius, useTheme } from "../lib/theme";
import { ErrorBox } from "./ErrorBox";
import { Button } from "./ui";

const RATINGS: { rating: ReviewRating; label: string }[] = [
  { rating: "again", label: "Again" },
  { rating: "hard", label: "Hard" },
  { rating: "good", label: "Good" },
  { rating: "easy", label: "Easy" },
];
const MAX_CARD_SECONDS = 120;

/** Works through the due cards: think, show the answer, rate it. Each rating saves the card's new schedule and the points. */
export function ReviewSession({ uid, today, cards }: { uid: string; today: string; cards: ReviewCard[] }) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState<ReviewRating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earned, setEarned] = useState(0);
  const shownAt = useRef(nowMs());
  const card = cards[index];

  async function rate(rating: ReviewRating) {
    setSaving(rating);
    setError(null);
    try {
      const seconds = Math.min(Math.round((nowMs() - shownAt.current) / 1000), MAX_CARD_SECONDS);
      const xp = reviewXp(rating);
      await saveReviewCard(uid, rateCard(card, rating, today));
      await addStats(uid, today, { xp, seconds });
      setEarned((total) => total + xp);
      setRevealed(false);
      shownAt.current = nowMs();
      setIndex(index + 1);
    } catch (err) {
      console.error("Failed to save the review rating:", err);
      setError(err instanceof Error ? err.message : "Could not save your rating.");
    } finally {
      setSaving(null);
    }
  }

  if (!card) {
    return (
      <View style={styles.done}>
        <Text style={{ color: theme.fgStrong, fontSize: 24, fontWeight: "800", marginBottom: 4 }}>All caught up</Text>
        <Text style={{ color: theme.fgMuted, fontSize: 14 }}>You reviewed {cards.length} {cards.length === 1 ? "card" : "cards"} and earned {earned} points.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "700", marginBottom: 4 }}>Card {index + 1} of {cards.length} · {CATEGORIES[card.category]}</Text>
      <Text style={{ color: theme.fgStrong, fontSize: 20, fontWeight: "800", marginBottom: 16 }}>{card.question}</Text>
      {!revealed ? (
        <Button title="Show answer" onPress={() => setRevealed(true)} />
      ) : (
        <>
          <Text style={[styles.answer, { backgroundColor: theme.correct, borderColor: theme.success, color: theme.fgStrong }]}>{card.options[card.correctIndex]}</Text>
          <Text style={{ color: theme.fgMuted, fontSize: 14, fontStyle: "italic", lineHeight: 20, marginBottom: 16 }}>{card.explanation}</Text>
          <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "700", marginBottom: 8 }}>How well did you know it?</Text>
          <View style={styles.ratings}>
            {RATINGS.map(({ rating, label }) => (
              <Pressable
                key={rating}
                accessibilityRole="button"
                disabled={saving !== null}
                onPress={() => void rate(rating)}
                style={[styles.rating, { backgroundColor: rating === "easy" ? theme.accent : rating === "again" ? theme.rustSoft : theme.accentSoft, opacity: saving !== null ? 0.6 : 1 }]}
              >
                <Text style={{ color: rating === "easy" ? theme.accentFg : rating === "again" ? theme.rust : theme.accent, fontWeight: "800", fontSize: 13 }}>
                  {saving === rating ? "Saving…" : label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {error && <ErrorBox message={error} />}
    </View>
  );
}

const styles = StyleSheet.create({
  done: { alignItems: "center", paddingVertical: 40 },
  answer: { borderWidth: 2, borderRadius: radius.sm, padding: 14, fontSize: 15, fontWeight: "700", marginBottom: 8, overflow: "hidden" },
  ratings: { flexDirection: "row", gap: 8 },
  rating: { flex: 1, borderRadius: radius.sm, paddingVertical: 13, alignItems: "center" },
});
