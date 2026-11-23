import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NoteSession } from "@random-knowledge/shared/notes";
import { getCompletedSessions } from "../../lib/notes-firestore";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { LoadingView } from "../LoadingView";
import { MarkdownBody } from "./MarkdownBody";
import { StrengthBar } from "./StrengthBar";

/** A note's finished quiz sessions, newest first, each opening into its transcript; nothing at all when there are none. */
export function PastSessions({ uid, noteId }: { uid: string; noteId: string }) {
  const theme = useTheme();
  const [result, setResult] = useState<{ key: string; sessions?: NoteSession[]; error?: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const key = `${uid}/${noteId}`;

  useEffect(() => {
    let cancelled = false;
    getCompletedSessions(uid, noteId)
      .then((sessions) => {
        if (!cancelled) setResult({ key, sessions });
      })
      .catch((err) => {
        console.error("Failed to load past sessions", err);
        if (!cancelled) setResult({ key, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [uid, noteId, key]);

  const current = result?.key === key ? result : null;
  if (!current) return <LoadingView text="Loading sessions" />;
  if (current.error) return <ErrorBox message={`Could not load past sessions: ${current.error}`} />;
  const sessions = current.sessions ?? [];
  if (sessions.length === 0) return null;

  return (
    <View style={{ marginTop: 28 }}>
      <Text style={[styles.heading, { color: theme.accent }]}>PAST SESSIONS</Text>
      {sessions.map((s) => (
        <View key={s.id} style={[styles.session, { borderColor: theme.border }]}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === s.id }} onPress={() => setOpen(open === s.id ? null : s.id)} style={styles.sessionHeader}>
            <Text style={{ color: theme.fgStrong, fontWeight: "700", fontSize: 14 }}>{s.completed_at?.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Text>
            {s.self_rating != null && <StrengthBar value={s.self_rating} />}
          </Pressable>
          {open === s.id && (
            <View style={[styles.transcript, { borderColor: theme.border }]}>
              {s.messages.map((m, i) =>
                m.role === "assistant" ? (
                  <View key={i} style={{ backgroundColor: theme.accentSoft, borderRadius: radius.sm, padding: 10 }}><MarkdownBody>{m.content}</MarkdownBody></View>
                ) : (
                  <Text key={i} style={{ color: theme.fg, borderWidth: 1, borderColor: theme.border, borderRadius: radius.sm, padding: 10, marginLeft: 24, fontSize: 14 }}>{m.content}</Text>
                ),
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: 8 },
  session: { borderWidth: 1, borderRadius: radius.sm, marginBottom: 8 },
  sessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  transcript: { borderTopWidth: 1, padding: 12, gap: 8 },
});
