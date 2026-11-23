import { NextResponse } from "next/server";
import { authorizeAppUser } from "@/lib/api-auth";
import { reportTokens, tokenBudgetGate } from "@/lib/budget-gate";
import { buildSystemPrompt, type NoteContext } from "@/lib/notes-prompts";
import { getOpenAI, NOTES_MODEL } from "@/lib/openai-client";

export const dynamic = "force-dynamic";

const MAX_MESSAGES = 40;
const MAX_TEXT = 10_000;

type ChatMessage = { role: "user" | "assistant"; content: string };

const isText = (value: unknown): value is string => typeof value === "string" && value.length <= MAX_TEXT;

function parseNoteContext(value: unknown): NoteContext | null {
  const ctx = value as Partial<NoteContext> | null;
  return ctx && isText(ctx.what_it_said) && isText(ctx.why_it_matters) && isText(ctx.application)
    ? { what_it_said: ctx.what_it_said, why_it_matters: ctx.why_it_matters, application: ctx.application }
    : null;
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length > MAX_MESSAGES) return null;
  const messages: ChatMessage[] = [];
  for (const m of value) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || !isText(m.content)) return null;
    messages.push({ role: m.role, content: m.content });
  }
  return messages;
}

/** Streams the next recall-coach turn of a quiz-chat session about one note, as server-sent events. */
export async function POST(request: Request) {
  const authorized = await authorizeAppUser(request);
  if (authorized instanceof NextResponse) return authorized;

  let body: { noteContext?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const noteContext = parseNoteContext(body.noteContext);
  if (!noteContext) return NextResponse.json({ error: "Missing or invalid noteContext" }, { status: 400 });
  const messages = parseMessages(body.messages ?? []);
  if (!messages) return NextResponse.json({ error: `messages must be at most ${MAX_MESSAGES} user/assistant turns of text` }, { status: 400 });

  const blocked = await tokenBudgetGate();
  if (blocked) return blocked;

  const questionCount = messages.filter((m) => m.role === "assistant").length;
  const encoder = new TextEncoder();

  const events = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      let tokens = 0;
      try {
        const stream = await getOpenAI().chat.completions.create({
          model: NOTES_MODEL,
          messages: [{ role: "system", content: buildSystemPrompt(noteContext, questionCount) }, ...messages],
          stream: true,
          stream_options: { include_usage: true },
        });
        for await (const chunk of stream) {
          if (chunk.usage) tokens = (chunk.usage.prompt_tokens ?? 0) + (chunk.usage.completion_tokens ?? 0);
          send(JSON.stringify(chunk));
        }
        send("[DONE]");
      } catch (err) {
        // The 200 and headers are already out, so the failure travels in the stream, with its real message.
        console.error("Note chat: OpenAI stream failed", err);
        send(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      await reportTokens(tokens);
      controller.close();
    },
  });

  return new Response(events, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
