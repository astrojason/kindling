import { useState } from "react";
import { Alert, Text } from "react-native";
import { resetAllUserData } from "../lib/firestore";
import { useTheme } from "../lib/theme";
import { LinkText } from "./ui";

/** "Reset my data" for the profile: confirms, shows it is working, then reports success or the full error. */
export function ResetDataLink({ uid, onReset }: { uid: string; onReset: () => void }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setDone(false);
    setError(null);
    try {
      await resetAllUserData(uid);
      onReset();
      setDone(true);
    } catch (err) {
      console.error("Reset failed", err);
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    Alert.alert(
      "Reset your data?",
      "This clears your streak, history, lessons, stash and topic preferences. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset my data", style: "destructive", onPress: () => void run() },
      ]
    );
  }

  return (
    <>
      <LinkText title={busy ? "Resetting…" : "Reset my data"} onPress={busy ? () => undefined : confirm} />
      {done && <Text accessibilityRole="alert" style={{ color: theme.success, fontSize: 13, fontWeight: "700", marginTop: 8 }}>✓ Your data was reset.</Text>}
      {error && <Text selectable style={{ color: theme.rust, fontSize: 12, marginTop: 8 }}>{error}</Text>}
    </>
  );
}
