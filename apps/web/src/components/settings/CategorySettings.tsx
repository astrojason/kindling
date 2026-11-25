"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import { CategoryPicker } from "@/components/lesson/CategoryPicker";
import { LoadState } from "@/components/share/PageFrame";
import { useToast } from "@/components/Toast";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/categories";
import { getSelectedCategories, setSelectedCategories } from "@/lib/firestore";
import { useLoad } from "@/lib/useLoad";

/** Which categories future lessons are drawn from: a summary on the page, edited in a dialog. Someone who has never chosen starts with all of them. */
export function CategorySettings({ uid }: { uid: string }) {
  const toast = useToast();
  const loaded = useLoad(`category-settings-${uid}`, async () => (await getSelectedCategories(uid)) ?? CATEGORY_KEYS);
  const [saved, setSaved] = useState<CategoryKey[] | null>(null);
  const [editing, setEditing] = useState(false);

  return (
    <section className="mt-6">
      <h2 className="font-heading text-lg font-bold text-fg-strong">Categories</h2>
      <LoadState state={loaded} notFound="Could not load your categories.">
        {(initial) => {
          const categories = saved ?? initial;
          return (
            <>
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-sm text-fg-muted">{categories.length} of {CATEGORY_KEYS.length} selected</p>
                <button type="button" onClick={() => setEditing(true)} className="rounded-button border-2 border-border px-3.5 py-1.5 text-sm font-extrabold text-accent hover:bg-accent-soft">
                  Edit categories
                </button>
              </div>
              {editing && (
                <Dialog title="Categories" onClose={() => setEditing(false)}>
                  <CategoryPicker
                    selectedCategories={categories}
                    compact
                    onCancel={() => setEditing(false)}
                    onSave={async (next) => {
                      await setSelectedCategories(uid, next);
                      setSaved(next);
                      setEditing(false);
                      toast("Categories saved for future lessons.");
                    }}
                  />
                </Dialog>
              )}
            </>
          );
        }}
      </LoadState>
    </section>
  );
}
