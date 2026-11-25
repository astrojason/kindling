"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscoverArticle } from "@random-knowledge/shared/discover";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { NoteForm } from "@/components/notes/NoteForm";
import { useToast } from "@/components/Toast";
import { ApiError, requestJson } from "@/lib/api-client";
import { createNote, incrementNotesStats } from "@/lib/notes-firestore";
import { fieldClass } from "@/components/form/field";

type Stage = "idle" | "marking" | "marking-read" | "ingesting" | "paste" | "drafting" | "draft-failed" | "review";

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const errorClass = "whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all";
const primary = "rounded-button border-2 border-accent bg-accent px-3 py-1.5 text-sm font-extrabold text-accent-fg hover:opacity-85 disabled:opacity-50";
const secondary = "rounded-button border-2 border-border px-3 py-1.5 text-sm font-extrabold text-fg-muted hover:border-accent disabled:opacity-50";

/**
 * One suggested article. "Make a note" first records the read date in the articles app, then fetches the full
 * text (or takes pasted text when scraping fails), has the AI draft a note, and opens it in the form to review
 * before anything is saved. "Mark as read" records it read and removes it; "Skip" only hides it until the feed reloads.
 */
export function ArticleCard({ article, uid, getToken, onDone }: { article: DiscoverArticle; uid: string; getToken: () => Promise<string>; onDone: (articleId: number) => void }) {
  const router = useRouter();
  const toast = useToast();
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
    toast(warnings.length > 0 ? warnings.join(" ") : "Note saved.");
    onDone(article.id);
    router.push(`/notes/${id}`);
  }

  const working = stage === "marking" || stage === "marking-read" || stage === "ingesting" || stage === "drafting";

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

        {stage === "review" && draft ? (
          <div className="mt-4 border-t border-border pt-4">
            <NoteForm initial={draft} submitLabel="Save note" onSubmit={save} onCancel={() => setStage("idle")} />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {stage === "paste" && (
              <div className="space-y-2">
                <textarea aria-label="Pasted article text" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} placeholder="Paste the article text here…" className={fieldClass} />
                <button type="button" disabled={!pasted.trim()} onClick={() => void makeNote(pasted.trim())} className={primary}>Use pasted text</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={working} onClick={() => void makeNote()} className={primary}>
                {stage === "marking-read" ? "Marking it read…" : stage === "ingesting" ? "Fetching the article…" : stage === "drafting" ? "Drafting the note…" : "Make a note"}
              </button>
              {stage === "draft-failed" && content && <button type="button" onClick={() => void makeDraft(content)} className={secondary}>Retry</button>}
              <button type="button" disabled={working} onClick={() => void markAsRead()} className={secondary}>{stage === "marking" ? "Marking read…" : "Mark as read"}</button>
              <button type="button" disabled={working} onClick={() => onDone(article.id)} className={secondary}>Skip</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
