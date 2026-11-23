import type { CreateNoteInput } from "./notes";

export type NoteInputResult = { ok: true; input: CreateNoteInput } | { ok: false; error: string };

type RawNoteInput = { [K in keyof CreateNoteInput]: string | null };

/** Trims a note form's values; everything but the source link is required, and a link must be http(s). */
export function validateNoteInput(raw: RawNoteInput): NoteInputResult {
  const title = raw.title?.trim() ?? "";
  const tag = raw.tag?.trim() ?? "";
  const what = raw.what_it_said?.trim() ?? "";
  const why = raw.why_it_matters?.trim() ?? "";
  const application = raw.application?.trim() ?? "";
  if (!title || !tag || !what || !why || !application) return { ok: false, error: "Fill in all required fields." };

  const source = raw.source_url?.trim() ?? "";
  if (source && !/^https?:\/\/\S+$/i.test(source)) {
    return { ok: false, error: "The source must be a web link starting with http:// or https://." };
  }
  return { ok: true, input: { title, tag, source_url: source || null, what_it_said: what, why_it_matters: why, application } };
}

/** The keywords plus a new one: trimmed, and skipped when blank or already present in any letter case. */
export function addKeyword(keywords: string[], input: string): string[] {
  const keyword = input.trim();
  if (!keyword || keywords.some((k) => k.toLowerCase() === keyword.toLowerCase())) return keywords;
  return [...keywords, keyword];
}
