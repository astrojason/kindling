import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Game } from "@random-knowledge/shared/games";
import { gameXp } from "@random-knowledge/shared/xp";
import { nowMs } from "@random-knowledge/shared/clock";
import { addStats, markGamePlayed } from "../../lib/firestore";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { Button } from "../ui";
import { OrderGame } from "./OrderGame";
import { PairsGame } from "./PairsGame";
import { TrueFalseGame } from "./TrueFalseGame";

const TITLES: Record<Game["kind"], string> = { pairs: "Match pairs", order: "Put in order", trueFalse: "True or false" };
const MAX_SECONDS = 300;

/** The bonus mini-game after a lesson: play once, then points and time are saved with visible progress and errors. */
export function GameView({ uid, date, game, played, onPlayed }: { uid: string; date: string; game: Game; played: boolean; onPlayed: () => void }) {
  const theme = useTheme();
  const [phase, setPhase] = useState<"idle" | "playing" | "saving" | "done">(played ? "done" : "idle");
  const [earned, setEarned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);
  const seed = `${date}-${game.kind}`;

  async function finish(misses: number) {
    const xp = gameXp(misses);
    const seconds = Math.min(Math.round((nowMs() - startedAt.current) / 1000), MAX_SECONDS);
    setPhase("saving");
    setError(null);
    try {
      await addStats(uid, date, { xp, seconds });
      await markGamePlayed(uid, date);
      setEarned(xp);
      setPhase("done");
      onPlayed();
    } catch (err) {
      console.error("Failed to save the mini-game result:", err);
      setError(err instanceof Error ? err.message : "Could not save your game result.");
      setPhase("playing");
    }
  }

  return (
    <View style={[styles.box, { backgroundColor: theme.accentSoft }]}>
      <Text style={{ color: theme.fgStrong, fontSize: 18, fontWeight: "800", marginBottom: 6 }}>Bonus game: {TITLES[game.kind]}</Text>
      {phase === "idle" && (
        <>
          <Text style={{ color: theme.fgMuted, fontSize: 14, marginBottom: 12 }}>A quick round for bonus points.</Text>
          <Button title="Play" onPress={() => { startedAt.current = nowMs(); setPhase("playing"); }} />
        </>
      )}
      {phase === "playing" && game.kind === "pairs" && <PairsGame pairs={game.pairs} seed={seed} onFinish={finish} />}
      {phase === "playing" && game.kind === "order" && <OrderGame prompt={game.prompt} items={game.items} seed={seed} onFinish={finish} />}
      {phase === "playing" && game.kind === "trueFalse" && <TrueFalseGame statements={game.statements} onFinish={finish} />}
      {phase === "saving" && <Text style={{ color: theme.fgMuted, fontWeight: "700" }}>Saving your points…</Text>}
      {phase === "done" && <Text style={{ color: theme.success, fontWeight: "700" }}>{earned !== null ? `Nice! +${earned} points` : "You played today’s game."}</Text>}
      {error && <ErrorBox message={error} />}
    </View>
  );
}

const styles = StyleSheet.create({ box: { borderRadius: radius.md, padding: 18, marginVertical: 16 } });
