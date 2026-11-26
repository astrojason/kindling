"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { DiscoverArticle } from "@random-knowledge/shared/discover";
import { LoadingView } from "@/components/lesson/LoadingView";
import { requestJson } from "@/lib/api-client";
import { useLoad } from "@/lib/useLoad";
import { fieldClass } from "@/components/form/field";
import { Select } from "@/components/form/Select";
import { ArticleCard } from "./ArticleCard";
import { useExploreTime } from "./useExploreTime";


/** Unread articles from the user's library that match their keywords, with search and category filters. Time here counts toward today's learning time. */
export function DiscoverFeed({ uid, getToken }: { uid: string; getToken: () => Promise<string> }) {
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const articleOpened = useExploreTime(uid);

  const params = new URLSearchParams();
  if (applied) params.set("search", applied);
  if (category) params.set("category", category);
  const query = params.toString();

  const feed = useLoad(`discover-${uid}-${query}`, async () => {
    const data = (await requestJson(`/api/discover/feed${query ? `?${query}` : ""}`, await getToken())) as { articles: DiscoverArticle[]; categories: string[] };
    setCategories(data.categories);
    return data;
  });

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setApplied(search.trim());
  }

  const articles = (feed.data?.articles ?? []).filter((a) => !removed.has(a.id));

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-fg-strong">Your articles</h1>
          <p className="text-xs text-fg-muted">Unread articles that match your keywords.</p>
        </div>
        <Link href="/notes" className="text-xs font-bold text-fg-muted hover:text-fg">← Notes</Link>
      </div>

      <form onSubmit={onSearch} className="mb-4 flex flex-wrap gap-2">
        <input aria-label="Search articles" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className={`${fieldClass} min-w-0 flex-1 basis-40`} />
        <button type="submit" className="rounded-button border-2 border-border px-3 py-1.5 text-sm font-extrabold text-fg-muted hover:border-accent">Search</button>
        <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </form>

      {feed.loading && <LoadingView text="Finding articles" />}
      {feed.error && (
        <div className="space-y-2">
          <pre role="alert" className="whitespace-pre-wrap rounded-sm bg-rust-soft p-3 text-xs text-rust select-all">{feed.error}</pre>
          {feed.error.includes("Settings") && <Link href="/profile" className="text-sm font-bold text-accent underline underline-offset-2">Open settings</Link>}
        </div>
      )}
      {!feed.loading && !feed.error && articles.length === 0 && <p className="py-6 text-center text-sm text-fg-muted">No unread articles match your keywords right now.</p>}
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} uid={uid} getToken={getToken} onOpenArticle={articleOpened} onDone={(id) => setRemoved((prev) => new Set(prev).add(id))} />
        ))}
      </div>
    </div>
  );
}
