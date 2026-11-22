import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { todayStr } from "@random-knowledge/shared/date";
import { getStreakStatus } from "@random-knowledge/shared/streak";
import type { StatsData, StreakData } from "@random-knowledge/shared/types";
import { GOAL_CHOICES, levelFor, xpIntoLevel, XP_PER_LEVEL } from "@random-knowledge/shared/xp";
import { DeleteAccountLink } from "../components/DeleteAccountLink";
import { ErrorBox } from "../components/ErrorBox";
import { LoadingView } from "../components/LoadingView";
import { Button, Card } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { getStats, getStreak, setGoalMinutes } from "../lib/firestore";
import { radius, useTheme } from "../lib/theme";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const LINKS = [
  { title: "Support", path: "/support" },
  { title: "Privacy policy", path: "/privacy" },
  { title: "Terms of service", path: "/terms" },
];

export function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [data, setData] = useState<{ stats: StatsData; streak: StreakData } | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [savingGoal, setSavingGoal] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getStats(user.uid), getStreak(user.uid)])
      .then(([stats, streak]) => {
        setData({ stats, streak });
        setGoal(stats.goalMinutes);
      })
      .catch((err) => {
        console.error("Failed to load the profile:", err);
        setError(err instanceof Error ? err.message : "Could not load your profile.");
      });
  }, [user]);

  async function chooseGoal(minutes: number) {
    if (!user) return;
    setSavingGoal(minutes);
    setError(null);
    try {
      await setGoalMinutes(user.uid, minutes);
      setGoal(minutes);
    } catch (err) {
      console.error("Failed to save the daily goal:", err);
      setError(err instanceof Error ? err.message : "Could not save your daily goal.");
    } finally {
      setSavingGoal(null);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out failed:", err);
      setError(err instanceof Error ? err.message : "Could not sign out.");
      setSigningOut(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card style={styles.stack}>
        {!data && !error && <LoadingView text="Loading your profile" />}
        {data && (
          <>
            <View style={styles.levelRow}>
              <View style={[styles.level, { backgroundColor: theme.accent }]}>
                <Text style={{ color: theme.accentFg, fontSize: 24, fontWeight: "800" }}>{levelFor(data.stats.xp)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: theme.fgStrong, fontSize: 20, fontWeight: "800" }}>{user?.displayName ?? "Your profile"}</Text>
                <Text style={{ color: theme.fgMuted, fontSize: 14 }}>Level {levelFor(data.stats.xp)} · {data.stats.xp} points</Text>
                <View style={[styles.track, { backgroundColor: theme.accentSoft }]}>
                  <View style={[styles.fill, { backgroundColor: theme.accent, flex: xpIntoLevel(data.stats.xp) / XP_PER_LEVEL }]} />
                  <View style={{ flex: 1 - xpIntoLevel(data.stats.xp) / XP_PER_LEVEL }} />
                </View>
              </View>
            </View>
            <View style={styles.tiles}>
              <Tile value={getStreakStatus(data.streak, todayStr()).count} label="Day streak" />
              <Tile value={data.streak.longest || 0} label="Personal best" />
            </View>
            <View>
              <Text style={{ color: theme.fgStrong, fontSize: 16, fontWeight: "800", marginBottom: 8 }}>Daily goal</Text>
              <View style={styles.goals}>
                {GOAL_CHOICES.map((minutes) => (
                  <Pressable
                    key={minutes}
                    accessibilityRole="button"
                    accessibilityState={{ selected: goal === minutes }}
                    disabled={savingGoal !== null}
                    onPress={() => void chooseGoal(minutes)}
                    style={[styles.goal, { backgroundColor: goal === minutes ? theme.accent : theme.accentSoft, opacity: savingGoal !== null ? 0.6 : 1 }]}
                  >
                    <Text style={{ color: goal === minutes ? theme.accentFg : theme.accent, fontWeight: "800", fontSize: 13 }}>
                      {savingGoal === minutes ? "Saving…" : `${minutes} min`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
        {API_BASE_URL && (
          <View style={{ gap: 8 }}>
            {LINKS.map((link) => (
              <Pressable key={link.path} accessibilityRole="link" onPress={() => void Linking.openURL(`${API_BASE_URL}${link.path}`).catch((err) => setError(err instanceof Error ? err.message : `Could not open ${link.title}.`))}
                style={[styles.link, { backgroundColor: theme.surfaceRaised }]}>
                <Text style={{ color: theme.fgStrong, fontWeight: "700", fontSize: 14 }}>{link.title}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Button title={signingOut ? "Signing out…" : "Sign out"} variant="secondary" disabled={signingOut} onPress={() => void handleSignOut()} />
        <View>
          <Text style={{ color: theme.fgMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>ACCOUNT</Text>
          <DeleteAccountLink />
        </View>
        {error && <ErrorBox message={error} />}
      </Card>
    </ScrollView>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.accentSoft }]}>
      <Text style={{ color: theme.accent, fontSize: 24, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  stack: { gap: 22 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  level: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  track: { flexDirection: "row", height: 8, borderRadius: 4, marginTop: 8, overflow: "hidden" },
  fill: { borderRadius: 4 },
  tiles: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, alignItems: "center", borderRadius: radius.sm, padding: 12 },
  goals: { flexDirection: "row", gap: 8 },
  goal: { flex: 1, borderRadius: radius.pill, paddingVertical: 10, alignItems: "center" },
  link: { borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 14 },
});
