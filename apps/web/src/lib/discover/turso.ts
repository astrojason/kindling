import { createClient, type Client, type InValue, type Row } from "@libsql/client";

// Direct read/write access to articles.astrojason.com's shared Turso database (tables: article,
// user_article_read, user_article_category, user_article_category_article). Every function takes the
// owner's articles-app uid and scopes its SQL to it: callers must pass the uid stored in the signed-in
// user's own settings, never one that came from the request.

/** The article does not exist for this owner (it may exist for someone else). */
export class ArticleNotFoundError extends Error {
  constructor(articleId: number) {
    super(`Article ${articleId} was not found in your library.`);
    this.name = "ArticleNotFoundError";
  }
}

let client: Client | null = null;
function getClient(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set: Discover cannot reach the articles database.");
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return client;
}

export interface DiscoverArticle {
  id: number;
  title: string;
  url: string;
  summary: string;
  readingTime: number;
  keywords: string[];
  categories: string[];
  content: string;
  createdAt: number;
}

export interface DiscoverFilterOptions {
  search?: string;
  category?: string;
}

/** Makes `%`, `_` and `\` in user text match themselves inside a LIKE pattern (used with ESCAPE '\'). */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

function rowToArticle(row: Row): DiscoverArticle {
  let keywords: string[] = [];
  try {
    const parsed = JSON.parse(String(row.keywords ?? "[]"));
    if (Array.isArray(parsed)) keywords = parsed;
  } catch (err) {
    console.error(`Article ${row.id} has a keywords column that is not valid JSON; showing it without keywords`, err);
  }
  const categories = String(row.categories ?? "");
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    url: String(row.url ?? ""),
    summary: String(row.summary ?? ""),
    readingTime: Number(row.reading_time ?? 0),
    keywords,
    categories: categories ? categories.split("||") : [],
    content: String(row.content ?? ""),
    createdAt: Number(row.created_timestamp ?? 0),
  };
}

/** Unread articles of this owner matching at least one keyword against the article's keywords column. */
export async function getUnreadArticlesForKeywords(articlesAppUid: string, keywords: string[], opts: DiscoverFilterOptions = {}): Promise<DiscoverArticle[]> {
  if (keywords.length === 0) return [];

  const keywordClauses = keywords.map(() => "LOWER(a.keywords) LIKE LOWER(?) ESCAPE '\\'").join(" OR ");
  const keywordArgs = keywords.map((k) => `%${escapeLike(k)}%`);

  let extraSql = "";
  const extraArgs: InValue[] = [];
  if (opts.search) {
    const pattern = `%${escapeLike(opts.search)}%`;
    extraSql += " AND (LOWER(a.title) LIKE LOWER(?) ESCAPE '\\' OR LOWER(a.summary) LIKE LOWER(?) ESCAPE '\\' OR LOWER(a.keywords) LIKE LOWER(?) ESCAPE '\\')";
    extraArgs.push(pattern, pattern, pattern);
  }
  if (opts.category) {
    extraSql += `
      AND EXISTS (
        SELECT 1 FROM user_article_category_article uaca
        JOIN user_article_category uac ON uac.id = uaca.user_article_category_id
        WHERE uaca.article_id = a.id AND uaca.created_by_uid = ? AND uac.name = ?
      )`;
    extraArgs.push(articlesAppUid, opts.category);
  }

  const sql = `
    SELECT
      a.id,
      a.title,
      a.url,
      COALESCE(a.summary, '') as summary,
      COALESCE(a.reading_time, 0) as reading_time,
      COALESCE(a.keywords, '[]') as keywords,
      COALESCE(a.content, '') as content,
      a.created_timestamp,
      COALESCE((
        SELECT GROUP_CONCAT(uac.name, '||')
        FROM user_article_category_article uaca
        JOIN user_article_category uac ON uac.id = uaca.user_article_category_id
        WHERE uaca.article_id = a.id AND uaca.created_by_uid = ?
      ), '') as categories
    FROM article a
    WHERE a.created_by_uid = ?
      AND NOT EXISTS (
        SELECT 1 FROM user_article_read
        WHERE article_id = a.id AND created_by_uid = ?
      )
      AND (${keywordClauses})
      ${extraSql}
    ORDER BY a.created_timestamp DESC
  `;
  const result = await getClient().execute({ sql, args: [articlesAppUid, articlesAppUid, articlesAppUid, ...keywordArgs, ...extraArgs] });
  return result.rows.map(rowToArticle);
}

export async function getCategories(articlesAppUid: string): Promise<string[]> {
  const result = await getClient().execute({ sql: "SELECT name FROM user_article_category WHERE created_by_uid = ? ORDER BY name", args: [articlesAppUid] });
  return result.rows.map((row) => String(row.name));
}

/** One article, only if it belongs to this owner. */
export async function getArticleForOwner(articlesAppUid: string, articleId: number): Promise<{ id: number; url: string; title: string; content: string } | null> {
  const result = await getClient().execute({
    sql: "SELECT id, url, title, COALESCE(content, '') as content FROM article WHERE id = ? AND created_by_uid = ?",
    args: [articleId, articlesAppUid],
  });
  const row = result.rows[0];
  return row ? { id: Number(row.id), url: String(row.url ?? ""), title: String(row.title ?? ""), content: String(row.content ?? "") } : null;
}

/** Stores scraped or pasted full text so the article is never fetched twice; throws if it is not the owner's. */
export async function updateArticleContent(articlesAppUid: string, articleId: number, content: string): Promise<void> {
  const result = await getClient().execute({ sql: "UPDATE article SET content = ? WHERE id = ? AND created_by_uid = ?", args: [content, articleId, articlesAppUid] });
  if (result.rowsAffected === 0) throw new ArticleNotFoundError(articleId);
}

/** Idempotent: records the article as read for this owner, and refuses one that is not theirs. */
export async function markArticleRead(articlesAppUid: string, articleId: number): Promise<void> {
  const owned = await getClient().execute({ sql: "SELECT COUNT(*) as count FROM article WHERE id = ? AND created_by_uid = ?", args: [articleId, articlesAppUid] });
  if (Number(owned.rows[0]?.count ?? 0) === 0) throw new ArticleNotFoundError(articleId);

  const existing = await getClient().execute({ sql: "SELECT COUNT(*) as count FROM user_article_read WHERE article_id = ? AND created_by_uid = ?", args: [articleId, articlesAppUid] });
  if (Number(existing.rows[0]?.count ?? 0) > 0) return;

  const now = Math.floor(Date.now() / 1000);
  await getClient().execute({
    sql: `INSERT INTO user_article_read (article_id, created_by_uid, updated_by_uid, flagged_for_deletion, created_timestamp, updated_timestamp) VALUES (?, ?, ?, 0, ?, ?)`,
    args: [articleId, articlesAppUid, articlesAppUid, now, now],
  });
}
