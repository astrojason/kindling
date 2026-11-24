"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_KEYS, type CategoryKey } from "@/lib/categories";

export function CategoryPicker({ selectedCategories, onSave, onCancel, editing = Boolean(onCancel), compact = false }: {
  selectedCategories: CategoryKey[];
  onSave: (categories: CategoryKey[]) => Promise<void>;
  onCancel?: () => void;
  /** Changing an existing choice (not the first-run one): different wording and button. Defaults to true when there is a cancel. */
  editing?: boolean;
  /** Sits inside a settings page: a section-sized heading and no divider under it. */
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(selectedCategories);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving || !selected.length) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your categories. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className={compact ? "" : "mb-6 border-b border-border pb-6"}>
      <fieldset disabled={saving} aria-describedby="category-help">
        <legend className={`font-heading text-fg-strong ${compact ? "text-lg font-bold" : "text-2xl"}`}>What would you like to learn?</legend>
        <p id="category-help" className="mb-4 mt-2 text-sm text-fg-muted">
          Choose at least one category. {editing ? "Changes apply to future lessons; today’s lesson stays the same." : "Your daily lessons will come from your selections. You can change them anytime."}
        </p>
        <div className="mb-3 flex gap-4 text-xs font-semibold text-accent">
          <button type="button" onClick={() => setSelected([...CATEGORY_KEYS])} className="underline">Select all</button>
          <button type="button" onClick={() => setSelected([])} className="underline">Clear all</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORY_KEYS.map((key) => (
            <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-sm border p-3 text-sm ${selected.includes(key) ? "border-accent bg-accent-soft text-accent" : "border-border text-fg-muted"}`}>
              <input
                type="checkbox"
                name="categories"
                value={key}
                checked={selected.includes(key)}
                onChange={(event) => setSelected((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))}
                className="h-4 w-4 shrink-0 accent-accent"
              />
              {CATEGORIES[key]}
            </label>
          ))}
        </div>
      </fieldset>
      <p aria-live="polite" className="mt-3 text-xs text-fg-muted">
        {selected.length ? `${selected.length} of ${CATEGORY_KEYS.length} selected` : "Choose at least one category to continue."}
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-rust">{error}</p>}
      <div className="mt-4 flex items-center gap-4">
        <button type="submit" disabled={saving || !selected.length} className="rounded-button bg-accent px-4 py-2 text-sm font-extrabold text-accent-fg disabled:opacity-60">
          {saving ? "Saving…" : editing ? "Save categories" : "Start learning"}
        </button>
        {onCancel && <button type="button" disabled={saving} onClick={onCancel} className="text-sm text-fg-muted underline disabled:opacity-60">Cancel</button>}
      </div>
    </form>
  );
}
