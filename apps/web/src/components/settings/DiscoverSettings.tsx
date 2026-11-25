"use client";

import { useState, type KeyboardEvent } from "react";
import { addKeyword } from "@random-knowledge/shared/notes-input";
import { useToast } from "@/components/Toast";
import { LoadState } from "@/components/share/PageFrame";
import { getNoteSettings, updateNoteSettings } from "@/lib/notes-firestore";
import { forgetExplore } from "@/lib/useExplore";
import { useLoad } from "@/lib/useLoad";

const inputClass = "w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent";

/** Which articles account Discover reads, and the keywords that pick which unread articles to suggest. */
export function DiscoverSettings({ uid }: { uid: string }) {
  const saved = useLoad(`discover-settings-${uid}`, () => getNoteSettings(uid));
  return (
    <LoadState state={saved} notFound="Could not load the Discover settings.">
      {(settings) => <DiscoverForm uid={uid} initialUid={settings.articlesAppUid ?? ""} initialKeywords={settings.interestKeywords} />}
    </LoadState>
  );
}

function DiscoverForm({ uid, initialUid, initialKeywords }: { uid: string; initialUid: string; initialKeywords: string[] }) {
  const toast = useToast();
  const [articlesAppUid, setArticlesAppUid] = useState(initialUid);
  const [keywords, setKeywords] = useState(initialKeywords);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add() {
    setKeywords(addKeyword(keywords, draft));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateNoteSettings(uid, { articlesAppUid: articlesAppUid.trim() || null, interestKeywords: keywords });
      // The articles account decides what Explore shows (and whether the tab is there at all).
      forgetExplore(uid);
      toast("Discover settings saved.");
    } catch (err) {
      console.error("Failed to save the Discover settings", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 space-y-3">
      <h2 className="font-heading text-lg font-bold text-fg-strong">Discover</h2>
      <p className="text-xs text-fg-muted">Suggests unread articles from your articles library that match your keywords, ready to turn into notes.</p>

      <label className="block">
        <span className="text-xs font-extrabold uppercase tracking-wide text-accent">Articles account</span>
        <input aria-label="Articles account uid" value={articlesAppUid} onChange={(e) => setArticlesAppUid(e.target.value)} placeholder="Your uid in the articles app" className={`${inputClass} mt-1`} />
      </label>

      <div>
        <span className="text-xs font-extrabold uppercase tracking-wide text-accent">Interest keywords</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} data-keyword={k} className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              {k}
              <button type="button" aria-label={`Remove keyword ${k}`} onClick={() => setKeywords(keywords.filter((x) => x !== k))} className="text-fg-muted hover:text-fg">✕</button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input aria-label="Add a keyword" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} placeholder="Add a keyword…" className={inputClass} />
          <button type="button" onClick={add} className="rounded-button border-2 border-border px-3 py-1.5 text-sm font-extrabold text-fg-muted hover:border-accent">Add</button>
        </div>
      </div>

      {error && <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>}
      <button type="button" disabled={saving} onClick={() => void save()} className="rounded-button bg-accent px-4 py-1.5 text-sm font-extrabold text-accent-fg hover:opacity-85 disabled:opacity-50">
        {saving ? "Saving…" : "Save"}
      </button>
    </section>
  );
}
