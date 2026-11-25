"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Note, NoteMessage, NoteSession } from "@random-knowledge/shared/notes";
import { parseSessionReply, ratingFromStoredReplies, RATING_LABELS } from "@random-knowledge/shared/session-protocol";
import { computeSM2 } from "@random-knowledge/shared/sm2";
import { useToast } from "@/components/Toast";
import { streamChat } from "@/lib/chat-stream";
import { todayStr } from "@/lib/date";
import { addStats } from "@/lib/firestore";
import { useStudyTimer } from "@/lib/useStudyTimer";
import { createSession, getCompletedSessions, getIncompleteSession, incrementNotesStats, updateNoteAfterRating, updateSession } from "@/lib/notes-firestore";
import { LoadingView } from "@/components/lesson/LoadingView";
import { MarkdownBody } from "./MarkdownBody";
import { fieldClass } from "@/components/form/field";

/** Time spent on one turn (reading the coach, thinking, answering) counts at most this long. */
const MAX_TURN_SECONDS = 3 * 60;

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const errorClass = "whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all";

/**
 * A recall-coach quiz about one note: resumes an unfinished session, streams the coach's questions, and ends
 * with a closing assessment whose suggested rating the user confirms. The rating feeds SM-2.
 */
export function QuizSession({ uid, note, getToken }: { uid: string; note: Note; getToken: () => Promise<string> }) {
  const router = useRouter();
  const toast = useToast();
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
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, streamText]);

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
    if (!navigator.onLine) {
      setError("No internet connection — quiz sessions need a live connection.");
      return;
    }
    setInput("");
    await takeTurn(session, messages, trimmed);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
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
    toast(failures.length > 0 ? `Recall saved, but ${failures.join(" and ")}` : "Recall saved.");
    router.push(`/notes/${note.id}`);
  }

  const rating = chosen ?? suggested ?? null;

  return (
    <div>
      <Link href={`/notes/${note.id}`} className="text-xs font-bold text-fg-muted hover:text-fg">← {note.title}</Link>
      <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wide text-accent">Quiz · {note.tag}</p>

      {phase === "loading" && !error && <LoadingView text="Opening your session" />}

      {messages.length > 0 || streaming ? (
        <div className="mt-4 space-y-3">
          {messages.map((m, i) =>
            m.role === "assistant" ? (
              <div key={i} className="rounded-sm bg-accent-soft px-3.5 py-3"><MarkdownBody>{m.content}</MarkdownBody></div>
            ) : (
              <p key={i} className="ml-8 whitespace-pre-wrap rounded-sm border border-border px-3.5 py-3 text-sm text-fg">{m.content}</p>
            ),
          )}
          {streaming && (
            <div className="rounded-sm bg-accent-soft px-3.5 py-3">
              {streamText ? <MarkdownBody>{parseSessionReply(streamText).display}</MarkdownBody> : <p className="text-sm text-fg-muted">Thinking…</p>}
            </div>
          )}
        </div>
      ) : null}
      <div ref={bottom} />

      {error && (
        <div className="mt-4 space-y-2">
          <pre role="alert" className={errorClass}>{error}</pre>
          {retry && (
            <button type="button" onClick={() => session && void (retry.text === undefined ? takeTurn(session, []) : send(retry.text))} className="rounded-button border-2 border-border px-3 py-1.5 text-sm font-extrabold text-fg-muted hover:border-accent">
              Retry
            </button>
          )}
        </div>
      )}

      {phase === "chat" && (
        <div className="mt-4 space-y-2">
          <textarea
            aria-label="Your answer"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={streaming}
            rows={3}
            placeholder="Answer in your own words…"
            className={fieldClass}
          />
          <button type="button" disabled={streaming || !input.trim()} onClick={() => void send(input)} className="rounded-button bg-accent px-4 py-1.5 text-sm font-extrabold text-accent-fg hover:opacity-85 disabled:opacity-50">
            {streaming ? "Thinking…" : "Send"}
          </button>
        </div>
      )}

      {phase === "rating" && (
        <div className="mt-5 space-y-3 rounded-sm border border-border p-3.5">
          <p className="text-sm font-bold text-fg-strong">How well did you recall it?</p>
          <div className="flex flex-wrap gap-2">
            {RATING_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-label={`Rate ${i + 1} ${label}`}
                aria-pressed={rating === i + 1}
                onClick={() => setChosen(i + 1)}
                className={`rounded-button px-3 py-1 text-xs font-bold ${rating === i + 1 ? "bg-accent text-accent-fg" : "border border-border text-fg-muted hover:border-accent"}`}
              >
                {i + 1} · {label}
              </button>
            ))}
          </div>
          <button type="button" disabled={saving || rating === null} onClick={() => rating !== null && void saveRating(rating)} className="rounded-button bg-accent px-4 py-1.5 text-sm font-extrabold text-accent-fg hover:opacity-85 disabled:opacity-50">
            {saving ? "Saving…" : "Save rating"}
          </button>
        </div>
      )}
    </div>
  );
}
