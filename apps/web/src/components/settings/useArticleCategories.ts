"use client";

import { requestJson } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useLoad } from "@/lib/useLoad";

/** The category names of the saved articles account (none until one is saved), for keyword suggestions. */
export function useArticleCategories(savedAccount: string | null) {
  const { user } = useAuth();
  return useLoad(`article-categories-${user?.uid ?? "signed-out"}-${savedAccount ?? ""}`, async () => {
    if (!user || !savedAccount) return [];
    const data = (await requestJson("/api/discover/categories", await user.getIdToken())) as { categories: string[] };
    return data.categories;
  });
}
