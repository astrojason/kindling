import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Note, NoteMessage, NoteSession } from "@random-knowledge/shared/notes";
import { parseSessionReply, ratingFromStoredReplies, RATING_LABELS } from "@random-knowledge/shared/session-protocol";
import { computeSM2 } from "@random-knowledge/shared/sm2";
import { todayStr } from "@random-knowledge/shared/date";
import { useStudyTimer } from "../../hooks/useStudyTimer";
import { streamChat } from "../../lib/chat";
import { addStats } from "../../lib/firestore";
import { createSession, getCompletedSessions, getIncompleteSession, incrementNotesStats, updateNoteAfterRating, updateSession } from "../../lib/notes-firestore";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { LoadingView } from "../LoadingView";
import { Button, LinkText } from "../ui";
import { Field } from "./Field";
import { MarkdownBody } from "./MarkdownBody";

/** Time spent on one turn (reading the coach, thinking, answering) counts at most this long. */
const MAX_TURN_SECONDS = 3 * 60;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * A recall-coach quiz about one note: resumes an unfinished session, streams the coach's questions, and ends
 * with a closing assessment whose suggested rating the user confirms. The rating feeds SM-2. This mirrors the
 * web's QuizSession (which has the tests) and uses the same shared helpers.
 */
export function QuizSession({ uid, note, getToken, onBack, onFinished }: { uid: string; note: Note; getToken: () => Promise<string>; onBack: () => void; onFinished: (notice: string) => void }) {
  const theme = useTheme();
  const [phase, setPhase] = useState<"loading" | "chat" | "rating">("loading");
  const [session, setSession] = useState<NoteSession | null>(null);
  const [messages, setMessages] = useState<NoteMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamText, setStreamText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<{ text?: string } | null>(null);
  const [suggested, setSuggested] = useState<number | undefined>(undefined);
  const [chosen, setChosen] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const started = useRef(false);
  const { timer, flush } = useStudyTimer(uid, MAX_TURN_SECONDS);

  // Time on the quiz counts toward the learning goal; what is left when the screen is left (an abandoned quiz) is saved then.
  useEffect(() => {
    return () => {
      timer.pause();
      void flush();
    };
  }, [timer, flush]);

  /** One coach turn: `previous` is the conversation so far, `userText` the answer being sent (none for the opener). */
  async function takeTurn(current: NoteSession, previous: NoteMessage[], userText?: string) {
    timer.pause(); // the coach is working now: waiting for it is not study time
    const outgoing: NoteMessage[] = userText === undefined ? previous : [...previous, { role: "user", content: userText }];
    setMessages(outgoing);
    setStreaming(true);
    setStreamText("");
    setError(null);
    setRetry(null);

    let reply: string;
    try {
      reply = await streamChat({
        token: await getToken(),
        noteContext: { what_it_said: note.what_it_said, why_it_matters: note.why_it_matters, application: note.application },
        messages: outgoing,
        onText: setStreamText,
      });
    } catch (err) {
      console.error("Quiz turn failed", err);
      setMessages(previous);
      setStreamText("");
      setStreaming(false);
      setError(message(err));
      setRetry({ text: userText });
      return;
    }

    const parsed = parseSessionReply(reply);
    const final: NoteMessage[] = [...outgoing, { role: "assistant", content: parsed.display }];
    setMessages(final);
    setStreamText("");
    setStreaming(false);
    timer.start(); // the reply is on screen: reading it and answering count
    try {
      await updateSession(uid, current.id, {
        messages: final,
        ...(parsed.complete ? { completed_at: new Date(), ...(parsed.rating !== undefined ? { suggested_rating: parsed.rating } : {}) } : {}),
      });
    } catch (err) {
      console.error("Failed to save the conversation", err);
      setError(`The conversation could not be saved: ${message(err)}`);
    }
    if (parsed.complete) {
      setSuggested(parsed.rating);
      setPhase("rating");
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const [open, completed] = await Promise.all([getIncompleteSession(uid, note.id), getCompletedSessions(uid, note.id)]);
        // A session that finished but was never rated goes back to the rating, not into a new quiz.
        const unrated = completed.find((s) => s.self_rating === null);
        if (unrated) {
          setSession(unrated);
          setMessages(unrated.messages);
          setSuggested(unrated.suggested_rating ?? ratingFromStoredReplies(unrated.messages));
          setPhase("rating");
          return;
        }
        const current: NoteSession = open ?? { id: await createSession(uid, note.id), note_id: note.id, messages: [], completed_at: null, self_rating: null, suggested_rating: null };
        setSession(current);
        setMessages(current.messages);
        setPhase("chat");
        if (current.messages.length === 0) await takeTurn(current, []);
        else timer.start();
      } catch (err) {
        console.error("Failed to open the quiz session", err);
        setError(message(err));
      }
    })();
    // Runs once per mount; the ref above keeps a development double-invoke from opening two sessions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !session || streaming) return;
    setInput("");
    await takeTurn(session, messages, trimmed);
  }

  async function saveRating(rating: number) {
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      const sm2 = computeSM2({ rating, intervalDays: note.interval_days, easinessFactor: note.easiness_factor, sessionCount: note.session_count });
      await updateNoteAfterRating(uid, note.id, sm2, rating);
      await updateSession(uid, session.id, { self_rating: rating });
    } catch (err) {
      console.error("Failed to save the rating", err);
      setError(message(err));
      setSaving(false);
      return;
    }
    // The rating itself is saved; whatever else could not be, the user is told rather than left to wonder.
    timer.pause();
    const seconds = timer.take();
    const failures: string[] = [];
    try {
      await incrementNotesStats(uid, { total_sessions: 1, ...(rating >= 3 ? { passing_sessions: 1 } : {}) });
    } catch (err) {
      console.error("Failed to update the notes stats", err);
      failures.push(`its stats could not be updated: ${message(err)}`);
    }
    if (seconds > 0) {
      try {
        await addStats(uid, todayStr(), { seconds });
      } catch (err) {
        console.error("Failed to record study time", err);
        failures.push(`its study time could not be recorded: ${message(err)}`);
      }
    }
    onFinished(failures.length > 0 ? `Recall saved, but ${failures.join(" and ")}` : "Recall saved.");
  }

  const rating = chosen ?? suggested ?? null;

  return (
    <View>
      <LinkText title={`← ${note.title}`} onPress={onBack} />
      <Text style={{ color: theme.accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginTop: 12 }}>QUIZ · {note.tag.toUpperCase()}</Text>

      {phase === "loading" && !error && <LoadingView text="Opening your session" />}

      <View style={styles.thread}>
        {messages.map((m, i) =>
          m.role === "assistant" ? (
            <View key={i} style={[styles.coach, { backgroundColor: theme.accentSoft }]}><MarkdownBody>{m.content}</MarkdownBody></View>
          ) : (
            <Text key={i} style={[styles.user, { color: theme.fg, borderColor: theme.border }]}>{m.content}</Text>
          ),
        )}
        {streaming && (
          <View style={[styles.coach, { backgroundColor: theme.accentSoft }]}>
            {streamText ? <MarkdownBody>{parseSessionReply(streamText).display}</MarkdownBody> : <Text style={{ color: theme.fgMuted }}>Thinking…</Text>}
          </View>
        )}
      </View>

      {error && (
        <View style={{ marginTop: 8 }}>
          <ErrorBox message={error} />
          {retry && <View style={{ marginTop: 10 }}><Button title="Retry" variant="secondary" onPress={() => session && void (retry.text === undefined ? takeTurn(session, []) : send(retry.text))} /></View>}
        </View>
      )}

      {phase === "chat" && (
        <View style={{ marginTop: 14 }}>
          <Field label="Your answer" value={input} onChangeText={setInput} editable={!streaming} multiline placeholder="Answer in your own words…" />
          <Button title={streaming ? "Thinking…" : "Send"} onPress={() => void send(input)} disabled={streaming || !input.trim()} />
        </View>
      )}

      {phase === "rating" && (
        <View style={[styles.rating, { borderColor: theme.border }]}>
          <Text style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "800", marginBottom: 10 }}>How well did you recall it?</Text>
          <View style={styles.chips}>
            {RATING_LABELS.map((label, i) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${i + 1} ${label}`}
                accessibilityState={{ selected: rating === i + 1 }}
                onPress={() => setChosen(i + 1)}
                style={[styles.chip, { backgroundColor: rating === i + 1 ? theme.accent : "transparent", borderColor: rating === i + 1 ? theme.accent : theme.border }]}
              >
                <Text style={{ color: rating === i + 1 ? theme.accentFg : theme.fgMuted, fontSize: 12, fontWeight: "700" }}>{i + 1} · {label}</Text>
              </Pressable>
            ))}
          </View>
          <Button title={saving ? "Saving…" : "Save rating"} onPress={() => rating !== null && void saveRating(rating)} disabled={saving || rating === null} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: 10, marginTop: 14 },
  coach: { borderRadius: radius.sm, padding: 12 },
  user: { borderWidth: 1, borderRadius: radius.sm, padding: 12, marginLeft: 28, fontSize: 15 },
  rating: { borderWidth: 1, borderRadius: radius.sm, padding: 14, marginTop: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
});
