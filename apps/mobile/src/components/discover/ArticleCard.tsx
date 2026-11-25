import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { ApiError } from "@random-knowledge/shared/api-client";
import type { DiscoverArticle } from "@random-knowledge/shared/discover";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { requestJson } from "../../lib/api";
import { createNote, incrementNotesStats } from "../../lib/notes-firestore";
import { radius, useTheme } from "../../lib/theme";
import { ErrorBox } from "../ErrorBox";
import { Field } from "../notes/Field";
import { NoteForm } from "../notes/NoteForm";
import { Button } from "../ui";

type Stage = "idle" | "marking" | "marking-read" | "ingesting" | "paste" | "drafting" | "draft-failed" | "review";

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * One suggested article. "Make a note" fetches the full text (or takes pasted text when scraping fails), has
 * the AI draft a note, and opens it in the form to review before anything is saved. "Mark as read" records it read and removes it; "Skip" only hides it until the feed reloads.
 * Mirrors the web's ArticleCard, which has the tests.
 */
export function ArticleCard({ article, uid, getToken, onDone, onSaved }: { article: DiscoverArticle; uid: string; getToken: () => Promise<string>; onDone: (articleId: number) => void; onSaved: (noteId: string, notice: string) => void }) {
  const theme = useTheme();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<CreateNoteInput> | null>(null);
  const [readRecorded, setReadRecorded] = useState(false);

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

  async function makeDraft(text: string) {
    setStage("drafting");
    setError(null);
    try {
      const result = await requestJson("/api/notes/draft", await getToken(), { method: "POST", body: JSON.stringify({ title: article.title, content: text }) });
      setDraft({ title: article.title, tag: result.tag, source_url: article.url, what_it_said: result.what_it_said, why_it_matters: result.why_it_matters, application: result.application });
      setStage("review");
    } catch (err) {
      console.error("Failed to draft a note from an article", err);
      setError(message(err));
      setStage("draft-failed");
    }
  }

  async function makeNote(pastedContent?: string) {
    setError(null);
    // The read date goes into the articles app as soon as "Make a note" is pressed, before the note exists.
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
    setStage("ingesting");
    let text: string;
    try {
      const result = await requestJson("/api/discover/ingest", await getToken(), { method: "POST", body: JSON.stringify({ articleId: article.id, ...(pastedContent ? { pastedContent } : {}) }) });
      text = result.content;
    } catch (err) {
      console.error("Failed to fetch an article's text", err);
      setError(message(err));
      // A failed scrape (422) is not a dead end: the user can paste the article text instead.
      setStage(err instanceof ApiError && err.status === 422 ? "paste" : "idle");
      return;
    }
    setContent(text);
    await makeDraft(text);
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

  const working = stage === "marking" || stage === "marking-read" || stage === "ingesting" || stage === "drafting";

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <Text style={{ color: theme.fgStrong, fontSize: 15, fontWeight: "800", textDecorationLine: "underline" }} onPress={() => /^https?:\/\//i.test(article.url) && Linking.openURL(article.url).catch((err) => console.error("Could not open the article", err))}>
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

      {stage === "review" && draft ? (
        <View style={[styles.review, { borderColor: theme.border }]}>
          <NoteForm initial={draft} submitLabel="Save note" onSubmit={save} onCancel={() => setStage("idle")} />
        </View>
      ) : (
        <View style={{ marginTop: 12, gap: 10 }}>
          {stage === "paste" && (
            <View>
              <Field label="Pasted article text" value={pasted} onChangeText={setPasted} multiline placeholder="Paste the article text here…" />
              <Button title="Use pasted text" onPress={() => void makeNote(pasted.trim())} disabled={!pasted.trim()} />
            </View>
          )}
          <Button title={stage === "marking-read" ? "Marking it read…" : stage === "ingesting" ? "Fetching the article…" : stage === "drafting" ? "Drafting the note…" : "Make a note"} onPress={() => void makeNote()} disabled={working} />
          {stage === "draft-failed" && content && <Button title="Retry" variant="secondary" onPress={() => void makeDraft(content)} />}
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
