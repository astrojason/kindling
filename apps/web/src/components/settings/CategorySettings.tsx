"use client";

import { CategoryPicker } from "@/components/lesson/CategoryPicker";
import { LoadState } from "@/components/share/PageFrame";
import { useToast } from "@/components/Toast";
import { CATEGORY_KEYS } from "@/lib/categories";
import { getSelectedCategories, setSelectedCategories } from "@/lib/firestore";
import { useLoad } from "@/lib/useLoad";

/** Which categories future lessons are drawn from. Someone who has never chosen starts with all of them. */
export function CategorySettings({ uid }: { uid: string }) {
  const toast = useToast();
  const saved = useLoad(`category-settings-${uid}`, async () => (await getSelectedCategories(uid)) ?? CATEGORY_KEYS);

  return (
    <section className="mt-6">
      <h2 className="sr-only">Categories</h2>
      <LoadState state={saved} notFound="Could not load your categories.">
        {(categories) => (
          <CategoryPicker
            selectedCategories={categories}
            editing
            compact
            onSave={async (next) => {
              await setSelectedCategories(uid, next);
              toast("Categories saved for future lessons.");
            }}
          />
        )}
      </LoadState>
    </section>
  );
}
