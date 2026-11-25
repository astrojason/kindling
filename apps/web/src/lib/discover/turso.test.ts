// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@libsql/client";
import { ArticleNotFoundError, getArticleForOwner, getCategories, getUnreadArticlesForKeywords, markArticleRead, updateArticleContent } from "./turso";

const execute = vi.fn();
vi.mock("@libsql/client", () => ({ createClient: vi.fn(() => ({ execute })) }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(createClient).mockReturnValue({ execute } as never);
  vi.stubEnv("TURSO_DATABASE_URL", "libsql://example.turso.io");
  vi.stubEnv("TURSO_AUTH_TOKEN", "token");
  execute.mockResolvedValue({ rows: [], rowsAffected: 0 });
});

describe("configuration", () => {
  it("fails with a clear message when the database URL is not set, instead of connecting to nothing", async () => {
    vi.stubEnv("TURSO_DATABASE_URL", "");
    await expect(getCategories("uid-1")).rejects.toThrow(/TURSO_DATABASE_URL/);
  });
});

describe("getUnreadArticlesForKeywords", () => {
  it("returns [] without querying when there are no keywords", async () => {
    expect(await getUnreadArticlesForKeywords("uid-1", [])).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("scopes to the owner's unread articles and ORs one LIKE per keyword", async () => {
    await getUnreadArticlesForKeywords("uid-1", ["woodworking", "astronomy"]);
    const { sql, args } = execute.mock.calls[0][0];
    expect(sql).toContain("a.created_by_uid = ?");
    expect(sql).toContain("NOT EXISTS");
    expect((sql.match(/LOWER\(a\.keywords\) LIKE LOWER\(\?\)/g) ?? []).length).toBe(2);
    expect(args.slice(0, 3)).toEqual(["uid-1", "uid-1", "uid-1"]);
    expect(args).toEqual(expect.arrayContaining(["%woodworking%", "%astronomy%"]));
  });

  it("also matches an article in one of the owner's categories whose whole name is a keyword", async () => {
    await getUnreadArticlesForKeywords("uid-1", ["Big Ideas Simply Explained", "astronomy"]);
    const { sql, args } = execute.mock.calls[0][0];
    const match = sql.slice(sql.indexOf("NOT EXISTS"));
    // Either a keyword LIKE or the category EXISTS, so an article untagged with the keyword still shows.
    expect(match).toMatch(/LOWER\(a\.keywords\) LIKE LOWER\(\?\) ESCAPE '\\' OR LOWER\(a\.keywords\) LIKE LOWER\(\?\) ESCAPE '\\'\s+OR EXISTS \(/);
    // A whole-name comparison (ignoring case), never a substring LIKE.
    expect(match).toContain("uaca.created_by_uid = ? AND LOWER(uac.name) IN (LOWER(?), LOWER(?))");
    expect(args.slice(3)).toEqual(["%Big Ideas Simply Explained%", "%astronomy%", "uid-1", "Big Ideas Simply Explained", "astronomy"]);
  });

  it("treats % and _ in a keyword or search as literal characters", async () => {
    await getUnreadArticlesForKeywords("uid-1", ["100%_sure"], { search: "50%" });
    const { sql, args } = execute.mock.calls[0][0];
    expect(sql).toContain("ESCAPE");
    expect(args).toContain("%100\\%\\_sure%");
    expect(args).toContain("%50\\%%");
  });

  it("adds the search and category filters, both scoped to the owner", async () => {
    await getUnreadArticlesForKeywords("uid-1", ["x"], { search: "chisel", category: "DIY" });
    const { sql, args } = execute.mock.calls[0][0];
    expect(sql).toContain("LOWER(a.title) LIKE LOWER(?)");
    expect(sql).toContain("user_article_category_article");
    expect(args).toContain("%chisel%");
    expect(args.slice(-2)).toEqual(["uid-1", "DIY"]);
  });

  it("maps rows, parsing the JSON keywords and the || categories", async () => {
    execute.mockResolvedValue({
      rows: [{ id: 42, title: "A Title", url: "https://example.com/a", summary: "S", reading_time: 5, keywords: '["woodworking","tools"]', content: "full", created_timestamp: 1700000000, categories: "DIY||Home" }],
    });
    expect(await getUnreadArticlesForKeywords("uid-1", ["woodworking"])).toEqual([
      { id: 42, title: "A Title", url: "https://example.com/a", summary: "S", readingTime: 5, keywords: ["woodworking", "tools"], categories: ["DIY", "Home"], content: "full", createdAt: 1700000000 },
    ]);
  });

  it("logs a corrupt keywords column with the article id and carries on with no keywords", async () => {
    execute.mockResolvedValue({ rows: [{ id: 7, title: "T", url: "u", keywords: "{not json", categories: "" }] });
    const [article] = await getUnreadArticlesForKeywords("uid-1", ["x"]);
    expect(article.keywords).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("7"), expect.anything());
  });
});

describe("getCategories", () => {
  it("returns the owner's category names", async () => {
    execute.mockResolvedValue({ rows: [{ name: "DIY" }, { name: "Home" }] });
    expect(await getCategories("uid-1")).toEqual(["DIY", "Home"]);
    expect(execute.mock.calls[0][0].args).toEqual(["uid-1"]);
  });
});

describe("getArticleForOwner", () => {
  it("returns the article only when it belongs to the owner", async () => {
    execute.mockResolvedValue({ rows: [{ id: 5, url: "https://example.com/a", title: "T", content: "" }] });
    expect(await getArticleForOwner("uid-1", 5)).toEqual({ id: 5, url: "https://example.com/a", title: "T", content: "" });
    expect(execute.mock.calls[0][0].sql).toContain("created_by_uid = ?");
    expect(execute.mock.calls[0][0].args).toEqual([5, "uid-1"]);
  });

  it("returns null for an article that is not theirs", async () => {
    expect(await getArticleForOwner("uid-1", 5)).toBeNull();
  });
});

describe("updateArticleContent", () => {
  it("only updates an article the owner owns", async () => {
    execute.mockResolvedValue({ rows: [], rowsAffected: 1 });
    await updateArticleContent("uid-1", 5, "text");
    const { sql, args } = execute.mock.calls[0][0];
    expect(sql).toContain("created_by_uid = ?");
    expect(args).toEqual(["text", 5, "uid-1"]);
  });

  it("throws when nothing was updated, because the article is not the owner's", async () => {
    execute.mockResolvedValue({ rows: [], rowsAffected: 0 });
    await expect(updateArticleContent("uid-1", 5, "text")).rejects.toBeInstanceOf(ArticleNotFoundError);
  });
});

describe("markArticleRead", () => {
  it("refuses an article that is not the owner's", async () => {
    execute.mockResolvedValueOnce({ rows: [{ count: 0 }] });
    await expect(markArticleRead("uid-1", 5)).rejects.toBeInstanceOf(ArticleNotFoundError);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does nothing when it is already marked read", async () => {
    execute.mockResolvedValueOnce({ rows: [{ count: 1 }] }).mockResolvedValueOnce({ rows: [{ count: 1 }] });
    await markArticleRead("uid-1", 5);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("inserts a read row for the owner's unread article", async () => {
    execute.mockResolvedValueOnce({ rows: [{ count: 1 }] }).mockResolvedValueOnce({ rows: [{ count: 0 }] }).mockResolvedValueOnce({ rows: [], rowsAffected: 1 });
    await markArticleRead("uid-1", 5);
    const insert = execute.mock.calls[2][0];
    expect(insert.sql).toContain("INSERT INTO user_article_read");
    expect(insert.args.slice(0, 3)).toEqual([5, "uid-1", "uid-1"]);
  });
});
