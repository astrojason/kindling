"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscoverArticle } from "@random-knowledge/shared/discover";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { NoteForm } from "@/components/notes/NoteForm";
import { useToast } from "@/components/Toast";
import { requestJson } from "@/lib/api-client";
import { createNote, incrementNotesStats } from "@/lib/notes-firestore";

type Stage = "idle" | "marking" | "marking-read" | "fetching" | "writing";

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const errorClass = "whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all";
const primary = "rounded-button border-2 border-accent bg-accent px-3 py-1.5 text-sm font-extrabold text-accent-fg hover:opacity-85 disabled:opacity-50";
const secondary = "rounded-button border-2 border-border px-3 py-1.5 text-sm font-extrabold text-fg-muted hover:border-accent disabled:opacity-50";

/**
 * One suggested article. "Make a note" opens the article in a new tab, records the read date in the articles app,
 * and opens the note form with the title, link and the article's text as "What did it say?" (saved text, or fetched
 * and saved by the server), for the user to write the rest themselves as they read.
 * "Mark as read" records it read and removes it; "Skip" only hides it until the feed reloads.
 */
export function ArticleCard({ article, uid, getToken, onDone }: { article: DiscoverArticle; uid: string; getToken: () => Promise<string>; onDone: (articleId: number) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [readRecorded, setReadRecorded] = useState(false);
  const [text, setText] = useState<string | null>(null);

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
    // Opened first, while still inside the click, so the browser does not block the new tab.
    if (/^https?:\/\//i.test(article.url)) window.open(article.url, "_blank", "noopener,noreferrer");
    setError(null);
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
    toast(warnings.length > 0 ? warnings.join(" ") : "Note saved.");
    onDone(article.id);
    router.push(`/notes/${id}`);
  }

  const working = stage === "marking" || stage === "marking-read" || stage === "fetching";

  return (
    // Always five rows (title, details, summary, keywords, actions), an empty one taking no height, so that on wide
    // screens the card shares its rows with the one beside it and their parts line up.
    <article className="rounded-sm border border-border p-3.5 lg:row-span-5 lg:grid lg:grid-rows-subgrid lg:gap-y-0">
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-fg-strong underline-offset-2 hover:underline lg:justify-self-start">{article.title}</a>
      <p className="mt-0.5 text-xs text-fg-muted">{article.readingTime > 0 ? `${article.readingTime} min · ` : ""}{article.categories.join(", ")}</p>
      <div>{article.summary && <p className="mt-2 text-sm text-fg">{article.summary}</p>}</div>
      <div>
        {article.keywords.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {article.keywords.map((k) => <span key={k} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent">{k}</span>)}
          </p>
        )}
      </div>

      <div>
        {error && <pre role="alert" className={`mt-3 ${errorClass}`}>{error}</pre>}

        {stage === "writing" ? (
          <div className="mt-4 border-t border-border pt-4">
            <NoteForm initial={{ title: article.title, source_url: article.url, what_it_said: text ?? "" }} submitLabel="Save note" onSubmit={save} onCancel={() => setStage("idle")} />
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={working} onClick={() => void makeNote()} className={primary}>{stage === "marking-read" ? "Marking it read…" : stage === "fetching" ? "Fetching the article…" : "Make a note"}</button>
            <button type="button" disabled={working} onClick={() => void markAsRead()} className={secondary}>{stage === "marking" ? "Marking read…" : "Mark as read"}</button>
            <button type="button" disabled={working} onClick={() => onDone(article.id)} className={secondary}>Skip</button>
          </div>
        )}
      </div>
    </article>
  );
}
