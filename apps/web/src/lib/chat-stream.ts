import type { NoteMessage } from "@random-knowledge/shared/notes";

interface ChatChunk {
  error?: string;
  choices?: Array<{ delta?: { content?: string } }>;
}

/**
 * Streams one recall-coach turn from /api/notes/chat as the signed-in user and returns the whole reply,
 * calling `onText` with the text so far. Nothing is swallowed: a non-OK response, an error event from the
 * server, a malformed chunk, or a connection that drops before the stream finishes all throw with the reason.
 */
export async function streamChat({
  token,
  noteContext,
  messages,
  onText,
}: {
  token: string;
  noteContext: { what_it_said: string; why_it_matters: string; application: string };
  messages: NoteMessage[];
  onText: (textSoFar: string) => void;
}): Promise<string> {
  const res = await fetch("/api/notes/chat", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ noteContext, messages }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  if (!res.body) throw new Error("The chat response had no response body.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) throw new Error("The chat stream ended unexpectedly before it finished.");
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return text;

      let chunk: ChatChunk;
      try {
        chunk = JSON.parse(payload);
      } catch {
        throw new Error(`Malformed chunk in the chat stream: ${payload.slice(0, 120)}`);
      }
      if (chunk.error) throw new Error(chunk.error);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
        onText(text);
      }
    }
  }
}
