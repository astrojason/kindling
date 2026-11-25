import { useEffect, useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import { getPreReviewEnabled, setPreReviewEnabled } from "../../lib/firestore";
import { useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { LoadingView } from "../LoadingView";

/** The pre-review switch: answer a couple of guess-first questions before each lesson. Saves on toggle, with progress, a confirmation or the full error. */
export function PreReviewSetting({ uid }: { uid: string }) {
  const theme = useTheme();
  const [loaded, setLoaded] = useState<{ enabled?: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPreReviewEnabled(uid)
      .then((enabled) => {
        if (!cancelled) setLoaded({ enabled });
      })
      .catch((err) => {
        console.error("Failed to load the pre-review setting", err);
        if (!cancelled) setLoaded({ error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (!loaded) return <LoadingView text="Loading pre-review" />;
  if (loaded.error || loaded.enabled === undefined) return <ErrorBox message={loaded.error ?? "Could not load this setting."} />;

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      await setPreReviewEnabled(uid, next);
      setLoaded({ enabled: next });
      setSaved(next ? "Pre-review turned on." : "Pre-review turned off.");
    } catch (err) {
      console.error("Failed to save the pre-review setting", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.fgStrong, fontSize: 16, fontWeight: "800", marginBottom: 4 }}>Pre-review</Text>
          <Text style={{ color: theme.fgMuted, fontSize: 12 }}>Answer a couple of quick questions before reading. Even a wrong guess gets you thinking before you find the answer.</Text>
        </View>
        {saving ? <ActivityIndicator /> : <Switch accessibilityLabel="Pre-review" value={loaded.enabled} onValueChange={(next) => void toggle(next)} />}
      </View>
      {saved && <Text accessibilityRole="alert" style={{ color: theme.success, fontSize: 13, fontWeight: "700", marginTop: 8 }}>{saved}</Text>}
      {error && <ErrorBox message={error} />}
    </View>
  );
}
