import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CATEGORIES } from "@random-knowledge/shared/categories";
import { gameFor } from "@random-knowledge/shared/games";
import type { DailyProgress, Lesson } from "@random-knowledge/shared/types";
import { useTheme } from "../lib/theme";
import { ErrorBox } from "./ErrorBox";
import { GameView } from "./games/GameView";
import { DeepLinks } from "./DeepLinks";
import { LessonBody } from "./LessonBody";
import { QuizReview } from "./QuizReview";
import { ShareLessonButton } from "./ShareLessonButton";
import { Button } from "./ui";

export function DoneView({
  lesson,
  date,
  progress,
  onMore,
  onLess,
  uid,
  earnedXp,
  rewardError,
}: {
  lesson: Lesson;
  date: string;
  progress: DailyProgress;
  onMore: () => void;
  onLess: () => void;
  uid?: string;
  earnedXp?: number | null;
  rewardError?: string | null;
}) {
  const theme = useTheme();
  const [flashed, setFlashed] = useState<"more" | "less" | null>(null);
  const [gamePlayed, setGamePlayed] = useState(!!progress.gamePlayed);
  const game = gameFor(lesson, date);

  function handle(kind: "more" | "less", action: () => void) {
    action();
    setFlashed(kind);
  }

  return (
    <View>
      <LessonBody lesson={lesson} />
      <View style={styles.summary}>
        <Text style={[styles.score, { color: theme.fgStrong }]}>
          {progress.correct} of {progress.total} today
        </Text>
        {!!earnedXp && <Text style={{ color: theme.accent, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>+{earnedXp} points</Text>}
        {rewardError && <ErrorBox message={rewardError} />}
        <Text style={{ color: theme.fgMuted, fontSize: 13, marginBottom: 16, textAlign: "center" }}>
          Today&apos;s topic: {CATEGORIES[lesson.category]}. Come back tomorrow for the next one.
        </Text>
        <DeepLinks lesson={lesson} />
        <ShareLessonButton lesson={lesson} date={date} />
        <Text style={{ color: theme.fgMuted, fontSize: 13, marginBottom: 10 }}>Want more like this, or less?</Text>
        <View style={styles.row}>
          <Button
            title={flashed === "less" ? "Got it" : `Less ${CATEGORIES[lesson.category]}`}
            variant="secondary"
            disabled={flashed === "less"}
            onPress={() => handle("less", onLess)}
          />
          <Button
            title={flashed === "more" ? "Got it" : `More ${CATEGORIES[lesson.category]}`}
            disabled={flashed === "more"}
            onPress={() => handle("more", onMore)}
          />
        </View>
      </View>
      {uid && game && <GameView uid={uid} date={date} game={game} played={gamePlayed} onPlayed={() => setGamePlayed(true)} />}
      {progress.answers && <QuizReview lesson={lesson} answers={progress.answers} />}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: "center", paddingVertical: 20 },
  score: { fontSize: 22, fontWeight: "800", marginBottom: 6 },
  row: { alignSelf: "stretch", gap: 10 },
});
