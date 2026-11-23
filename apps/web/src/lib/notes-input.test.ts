import { describe, expect, it } from "vitest";
import { addKeyword, validateNoteInput } from "@random-knowledge/shared/notes-input";

const full = { title: " Black holes ", tag: " physics ", source_url: " https://example.com/a ", what_it_said: " W ", why_it_matters: " Y ", application: " A " };

describe("validateNoteInput", () => {
  it("trims every field and returns the note input", () => {
    expect(validateNoteInput(full)).toEqual({
      ok: true,
      input: { title: "Black holes", tag: "physics", source_url: "https://example.com/a", what_it_said: "W", why_it_matters: "Y", application: "A" },
    });
  });

  it("treats a blank source URL as none", () => {
    const result = validateNoteInput({ ...full, source_url: "   " });
    expect(result.ok && result.input.source_url).toBeNull();
  });

  it.each(["title", "tag", "what_it_said", "why_it_matters", "application"] as const)("requires %s", (field) => {
    const result = validateNoteInput({ ...full, [field]: "  " });
    expect(result).toEqual({ ok: false, error: "Fill in all required fields." });
  });

  it.each(["not a url", "ftp://example.com", "javascript:alert(1)"])("rejects a source that is not an http(s) link (%s)", (url) => {
    expect(validateNoteInput({ ...full, source_url: url })).toEqual({ ok: false, error: "The source must be a web link starting with http:// or https://." });
  });
});

describe("addKeyword", () => {
  it("appends a trimmed keyword", () => {
    expect(addKeyword(["woodworking"], "  astronomy ")).toEqual(["woodworking", "astronomy"]);
  });

  it("ignores blanks and duplicates, whatever their case", () => {
    expect(addKeyword(["woodworking"], "   ")).toEqual(["woodworking"]);
    expect(addKeyword(["Woodworking"], "woodworking")).toEqual(["Woodworking"]);
  });

  it("does not change the list it was given", () => {
    const list = ["a"];
    addKeyword(list, "b");
    expect(list).toEqual(["a"]);
  });
});
