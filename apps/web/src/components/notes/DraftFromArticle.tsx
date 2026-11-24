"use client";

import { useState } from "react";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { requestJson } from "@/lib/api-client";

const inputClass = "w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent";

/** Paste an article and let the AI draft a note from it; the draft is handed back for the user to review and edit. */
export function DraftFromArticle({ getToken, onDraft }: { getToken: () => Promise<string>; onDraft: (draft: Partial<CreateNoteInput>) => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    setError(null);
    setBusy(true);
    try {
      const result = await requestJson("/api/notes/draft", await getToken(), { method: "POST", body: JSON.stringify({ title: title.trim(), content: text.trim() }) });
      onDraft({ title: title.trim(), tag: result.tag, what_it_said: result.what_it_said, why_it_matters: result.why_it_matters, application: result.application });
    } catch (err) {
      console.error("Failed to draft a note", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-sm border border-border p-3.5">
      <p className="text-sm font-bold text-fg-strong">Draft from an article</p>
      <input aria-label="Article title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" className={inputClass} />
      <textarea aria-label="Article text" value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste the article text…" className={inputClass} />
      {error && <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>}
      <button
        type="button"
        disabled={busy || !title.trim() || !text.trim()}
        onClick={() => void draft()}
        className="rounded-button bg-accent px-3.5 py-1.5 text-sm font-extrabold text-accent-fg hover:opacity-85 disabled:opacity-50"
      >
        {busy ? "Drafting…" : "Draft a note"}
      </button>
    </div>
  );
}
