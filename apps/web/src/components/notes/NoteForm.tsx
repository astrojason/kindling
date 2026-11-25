"use client";

import { useState, type FormEvent } from "react";
import type { CreateNoteInput } from "@random-knowledge/shared/notes";
import { validateNoteInput } from "@random-knowledge/shared/notes-input";
import { fieldClass } from "@/components/form/field";

const chip = (active: boolean) =>
  `rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-accent text-accent-fg" : "border border-border text-fg-muted hover:border-accent"}`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold uppercase tracking-wide text-accent">{label}</span>
      {hint && <span className="ml-2 text-xs text-fg-muted">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

/** Create or edit a note. Everything but the source link is required; saving shows progress and any failure in full. */
export function NoteForm({
  initial,
  existingTags = [],
  submitLabel = "Save note",
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CreateNoteInput>;
  existingTags?: string[];
  submitLabel?: string;
  onSubmit: (input: CreateNoteInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url ?? "");
  const [what, setWhat] = useState(initial?.what_it_said ?? "");
  const [why, setWhy] = useState(initial?.why_it_matters ?? "");
  const [application, setApplication] = useState(initial?.application ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const result = validateNoteInput({ title, tag, source_url: sourceUrl, what_it_said: what, why_it_matters: why, application });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(result.input);
    } catch (err) {
      console.error("Failed to save note", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title">
        <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title…" className={fieldClass} />
      </Field>
      <Field label="What did it say?" hint="Markdown">
        <textarea aria-label="What did it say?" value={what} onChange={(e) => setWhat(e.target.value)} rows={4} className={fieldClass} />
      </Field>
      <Field label="Why does it matter?" hint="Markdown">
        <textarea aria-label="Why does it matter?" value={why} onChange={(e) => setWhy(e.target.value)} rows={3} className={fieldClass} />
      </Field>
      <Field label="How would you explain it?" hint="Markdown">
        <textarea aria-label="How would you explain it?" value={application} onChange={(e) => setApplication(e.target.value)} rows={4} className={fieldClass} />
      </Field>
      <div>
        <span className="text-xs font-extrabold uppercase tracking-wide text-accent">Tag</span>
        {existingTags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {existingTags.map((t) => (
              <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className={chip(tag === t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        <input aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Enter a tag…" className={`${fieldClass} mt-2`} />
      </div>
      <Field label="Source" hint="optional">
        <input aria-label="Source URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className={fieldClass} />
      </Field>

      {error && <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{error}</pre>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-button bg-accent px-4 py-2 text-sm font-extrabold text-accent-fg hover:opacity-85 disabled:opacity-50">
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="text-sm font-bold text-fg-muted hover:text-fg disabled:opacity-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
