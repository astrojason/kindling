import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import type { DiscoverArticle } from "@random-knowledge/shared/discover";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { requestJson } from "../../lib/api";
import { createNote, incrementNotesStats } from "../../lib/notes-firestore";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { NoteForm } from "../notes/NoteForm";
import { Button } from "../ui";

type Stage = "idle" | "marking" | "marking-read" | "fetching" | "writing";

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * One suggested article. "Make a note" records the read date in the articles app, opens the article in the browser,
 * and opens the note form with the title, link and the article's text as "What did it say?" (saved text, or fetched
 * and saved by the server), for the user to write the rest themselves as they read.
 * "Mark as read" records it read and removes it; "Skip" only hides it until the feed reloads.
 * Mirrors the web's ArticleCard, which has the tests.
 */
export function ArticleCard({ article, uid, getToken, onDone, onSaved }: { article: DiscoverArticle; uid: string; getToken: () => Promise<string>; onDone: (articleId: number) => void; onSaved: (noteId: string, notice: string) => void }) {
  const theme = useTheme();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [readRecorded, setReadRecorded] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const isWebLink = /^https?:\/\//i.test(article.url);
  const openArticle = () => Linking.openURL(article.url);

  const markRead = async () => requestJson("/api/discover/mark-read", await getToken(), { method: "POST", body: JSON.stringify({ articleId: article.id }) });

  async function markAsRead() {
    setStage("marking");
    setError(null);
    try {
      await markRead();
      onDone(article.id);
    } catch (err) {
      console.error("Failed to mark an article read", err);
      setError(message(err));
      setStage("idle");
    }
  }

  async function makeNote() {
    setError(null);
    // Recorded before the browser opens: once Safari is in front, iOS may pause the app mid-request.
    if (!readRecorded) {
      setStage("marking-read");
      try {
        await markRead();
        setReadRecorded(true);
      } catch (err) {
        console.error("Failed to record the article's read date", err);
        setError(`Could not mark the article read: ${message(err)}`);
        setStage("idle");
        return;
      }
    }
    // Fetched before the browser opens too, for the same reason.
    if (text === null) {
      setStage("fetching");
      try {
        const result = (await requestJson("/api/discover/ingest", await getToken(), { method: "POST", body: JSON.stringify({ articleId: article.id }) })) as { content: string };
        setText(result.content);
      } catch (err) {
        // Not a dead end: the form still opens, and the text can be pasted into "What did it say?".
        console.error("Failed to fetch an article's text", err);
        setError(`Could not fetch the article's text: ${message(err)}`);
      }
    }
    setStage("writing");
    if (!isWebLink) return;
    try {
      await openArticle();
    } catch (err) {
      console.error("Could not open the article", err);
      setError(`Could not open the article: ${message(err)}`);
    }
  }

  async function save(input: CreateNoteInput) {
    const id = await createNote(uid, input);
    const warnings: string[] = [];
    try {
      await incrementNotesStats(uid, { total_notes: 1 });
    } catch (err) {
      console.error("Failed to update the notes count", err);
      warnings.push(`Note saved, but its count could not be updated: ${message(err)}.`);
    }
    onDone(article.id);
    onSaved(id, warnings.length > 0 ? warnings.join(" ") : "Note saved.");
  }

  const working = stage === "marking" || stage === "marking-read" || stage === "fetching";

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <Text style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "800", textDecorationLine: "underline" }} onPress={() => isWebLink && openArticle().catch((err) => { console.error("Could not open the article", err); setError(`Could not open the article: ${message(err)}`); })}>
        {article.title}
      </Text>
      <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 2 }}>{article.readingTime > 0 ? `${article.readingTime} min · ` : ""}{article.categories.join(", ")}</Text>
      {article.summary ? <Text style={{ color: theme.fg, fontSize: 14, marginTop: 8 }}>{article.summary}</Text> : null}
      {article.keywords.length > 0 && (
        <View style={styles.chips}>
          {article.keywords.map((k) => <Text key={k} style={[styles.chip, { backgroundColor: theme.accentSoft, color: theme.accent }]}>{k}</Text>)}
        </View>
      )}

      {error && <ErrorBox message={error} />}

      {stage === "writing" ? (
        <View style={[styles.review, { borderColor: theme.border }]}>
          <NoteForm initial={{ title: article.title, source_url: article.url, what_it_said: text ?? "" }} submitLabel="Save note" onSubmit={save} onCancel={() => setStage("idle")} />
        </View>
      ) : (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Button title={stage === "marking-read" ? "Marking it read…" : stage === "fetching" ? "Fetching the article…" : "Make a note"} onPress={() => void makeNote()} disabled={working} />
          <Button title={stage === "marking" ? "Marking read…" : "Mark as read"} variant="secondary" onPress={() => void markAsRead()} disabled={working} />
          <Button title="Skip" variant="secondary" onPress={() => onDone(article.id)} disabled={working} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.sm, padding: 14, marginBottom: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, fontSize: 11, fontWeight: "700", overflow: "hidden" },
  review: { borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
});
