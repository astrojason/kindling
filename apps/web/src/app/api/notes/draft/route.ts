import { NextResponse } from "next/server";
import { authorizeAppUser } from "@/lib/api-auth";
import { reportTokens, tokenBudgetGate } from "@/lib/budget-gate";
import { buildDraftPrompt } from "@/lib/notes-prompts";
import { getOpenAI, NOTES_MODEL } from "@/lib/openai-client";

export const dynamic = "force-dynamic";

interface DraftFields {
  tag?: string;
  what_it_said?: string;
  why_it_matters?: string;
  application?: string;
}

/** Drafts a spaced-repetition note (tag + what / why / application) from an article's title and text. */
export async function POST(request: Request) {
  const authorized = await authorizeAppUser(request);
  if (authorized instanceof NextResponse) return authorized;

  let body: { title?: unknown; content?: unknown; summary?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const title = text(body.title);
  const article = text(body.content) || text(body.summary);
  if (!title || !article) return NextResponse.json({ error: "Missing title or content/summary" }, { status: 400 });

  const blocked = await tokenBudgetGate();
  if (blocked) return blocked;

  let completion;
  try {
    completion = await getOpenAI().chat.completions.create({
      model: NOTES_MODEL,
      messages: [{ role: "user", content: buildDraftPrompt(title, article) }],
      response_format: { type: "json_object" },
    });
  } catch (err) {
    console.error("Note draft: OpenAI request failed", err);
    return NextResponse.json({ error: `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }
  await reportTokens(completion.usage?.total_tokens);

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return NextResponse.json({ error: "OpenAI returned no content" }, { status: 502 });

  let parsed: DraftFields;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Note draft: malformed JSON from the model", err);
    return NextResponse.json({ error: "OpenAI returned malformed JSON" }, { status: 502 });
  }
  if (!parsed.what_it_said || !parsed.why_it_matters || !parsed.application) {
    return NextResponse.json({ error: "OpenAI response missing required fields" }, { status: 502 });
  }

  return NextResponse.json({ tag: parsed.tag ?? "", what_it_said: parsed.what_it_said, why_it_matters: parsed.why_it_matters, application: parsed.application });
}
