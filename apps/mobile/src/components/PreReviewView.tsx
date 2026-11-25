import { plainMath } from "@random-knowledge/shared/math";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Lesson } from "@random-knowledge/shared/types";
import { useTheme } from "../lib/theme";

/** Guess-first questions before the lesson: any answer moves on (a wrong guess still primes the reading); skipping goes straight to it. */
export function PreReviewView({
  lesson,
  preReview,
  onAnswer,
  onSkip,
}: {
  lesson: Lesson;
  preReview: { qIndex: number };
  onAnswer: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const questions = lesson.preQuiz ?? [];
  const q = questions[preReview.qIndex];
  if (!q) return null;

  return (
    <View>
      <Text style={{ color: theme.fgMuted, fontSize: 13.5, fontStyle: "italic", lineHeight: 20, marginBottom: 16 }}>
        Even a wrong guess gets you thinking before you find the answer.
      </Text>
      <Text style={{ color: theme.fgMuted, fontSize: 12, marginBottom: 6 }}>
        Question {preReview.qIndex + 1} of {questions.length}
      </Text>
      <Text style={[styles.question, { color: theme.fgStrong }]}>{plainMath(q.question)}</Text>
      <View style={{ marginBottom: 4 }}>
        {q.options.map((option, i) => (
          <Pressable key={i} onPress={onAnswer} style={[styles.option, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ color: theme.fg, fontSize: 14.5 }}>{plainMath(option)}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onSkip} accessibilityRole="button">
        <Text style={{ color: theme.fgMuted, fontSize: 13, textDecorationLine: "underline" }}>Skip to the lesson</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 17, fontWeight: "600", marginBottom: 14 },
  option: { borderRadius: 6, borderWidth: 2, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
});
